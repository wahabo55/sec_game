// Firebase configuration and database functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getDatabase, ref, set, push, onValue, off, remove } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCFg8EsWtQFXooEut6KkicPFmJy94a1kgU",
  authDomain: "pam-se.firebaseapp.com",
  databaseURL: "https://pam-se-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pam-se",
  storageBucket: "pam-se.firebasestorage.app",
  messagingSenderId: "244442511423",
  appId: "1:244442511423:web:2a5b6749d41ee75283e08a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Authenticate anonymously before any database operations
async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

// Generate 6-digit game code
function generateGameCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a new game session
export async function createGame(hostName) {
  try {
    await ensureAuth();
    const gameCode = generateGameCode();
    const gameRef = ref(database, `games/${gameCode}`);
    
    const gameData = {
      hostName,
      gameCode,
      status: 'waiting', // waiting, active, finished
      currentQuestion: 0,
      players: {},
      createdAt: Date.now(),
      startTime: null
    };

    await set(gameRef, gameData);
    return gameCode;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
}

// Join a game as a player
export async function joinGame(gameCode, playerName, playerEmoji = '😊') {
  try {
    await ensureAuth();
    const gameRef = ref(database, `games/${gameCode}`);
    const playerRef = ref(database, `games/${gameCode}/players/${playerName}`);
    
    // Check if game exists
    return new Promise((resolve, reject) => {
      onValue(gameRef, (snapshot) => {
        const game = snapshot.val();
        if (!game) {
          reject(new Error('Game not found'));
          return;
        }
        
        if (game.status === 'finished') {
          reject(new Error('Game has ended'));
          return;
        }

        // Check if player name is taken
        if (game.players && game.players[playerName]) {
          reject(new Error('Player name already taken'));
          return;
        }

        // Add player to game
        const playerData = {
          name: playerName,
          emoji: playerEmoji,
          score: 0,
          answers: {},
          joinedAt: Date.now(),
          answerTimes: {}
        };

        set(playerRef, playerData).then(() => {
          resolve(gameCode);
        }).catch(reject);
      }, { onlyOnce: true });
    });
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
}

// Start the quiz (host only)
export async function startQuiz(gameCode) {
  try {
    const gameRef = ref(database, `games/${gameCode}`);
    await set(ref(database, `games/${gameCode}/status`), 'active');
    await set(ref(database, `games/${gameCode}/startTime`), Date.now());
    await set(ref(database, `games/${gameCode}/currentQuestion`), 0);
  } catch (error) {
    console.error('Error starting quiz:', error);
    throw error;
  }
}

// Send next question (host only)
export async function sendNextQuestion(gameCode, questionIndex) {
  try {
    const gameRef = ref(database, `games/${gameCode}`);
    await set(ref(database, `games/${gameCode}/currentQuestion`), questionIndex);
    await set(ref(database, `games/${gameCode}/questionStartTime`), Date.now());
  } catch (error) {
    console.error('Error sending question:', error);
    throw error;
  }
}

// Submit answer (player only)
export async function submitAnswer(gameCode, playerName, questionId, answer, timeToAnswer) {
  try {
    const answerRef = ref(database, `games/${gameCode}/players/${playerName}/answers/${questionId}`);
    const answerData = {
      answer,
      timeToAnswer,
      submittedAt: Date.now()
    };
    
    await set(answerRef, answerData);
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
}

// Update player score
export async function updatePlayerScore(gameCode, playerName, newScore) {
  try {
    const scoreRef = ref(database, `games/${gameCode}/players/${playerName}/score`);
    await set(scoreRef, newScore);
  } catch (error) {
    console.error('Error updating score:', error);
    throw error;
  }
}

// Listen to game state changes
export function listenToGame(gameCode, callback) {
  const gameRef = ref(database, `games/${gameCode}`);
  onValue(gameRef, callback);
  return () => off(gameRef, 'value', callback);
}

// Listen to players in game
export function listenToPlayers(gameCode, callback) {
  const playersRef = ref(database, `games/${gameCode}/players`);
  onValue(playersRef, callback);
  return () => off(playersRef, 'value', callback);
}

// End game (host only)
export async function endGame(gameCode) {
  try {
    await set(ref(database, `games/${gameCode}/status`), 'finished');
    await set(ref(database, `games/${gameCode}/endTime`), Date.now());
  } catch (error) {
    console.error('Error ending game:', error);
    throw error;
  }
}

// Delete game (cleanup)
export async function deleteGame(gameCode) {
  try {
    const gameRef = ref(database, `games/${gameCode}`);
    await remove(gameRef);
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
}

// Get leaderboard
export function getLeaderboard(gameCode, callback) {
  const playersRef = ref(database, `games/${gameCode}/players`);
  onValue(playersRef, (snapshot) => {
    const players = snapshot.val();
    if (players) {
      const leaderboard = Object.values(players)
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
          ...player,
          rank: index + 1
        }));
      callback(leaderboard);
    }
  });
}
