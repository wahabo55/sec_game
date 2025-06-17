// Firebase configuration and database functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getDatabase, ref, set, push, onValue, off, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

// Firebase configuration
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
const storage = getStorage(app);

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
export async function sendNextQuestion(gameCode, questionIndex, timeLimit = 20) {
  try {
    const gameRef = ref(database, `games/${gameCode}`);
    const questionStartTime = Date.now();
    await set(ref(database, `games/${gameCode}/currentQuestion`), questionIndex);
    await set(ref(database, `games/${gameCode}/questionStartTime`), questionStartTime);
    await set(ref(database, `games/${gameCode}/questionTimeLimit`), timeLimit);
    await set(ref(database, `games/${gameCode}/questionEndTime`), questionStartTime + (timeLimit * 1000));
  } catch (error) {
    console.error('Error sending question:', error);
    throw error;
  }
}

// Submit answer (player only)
export async function submitAnswer(gameCode, playerName, questionId, answer, timeToAnswer) {
  try {
    // Submit the answer
    const answerRef = ref(database, `games/${gameCode}/players/${playerName}/answers/${questionId}`);
    const answerData = {
      answer,
      timeToAnswer,
      submittedAt: Date.now()
    };
    await set(answerRef, answerData);
    
    // Mark player as having answered current question
    const statusRef = ref(database, `games/${gameCode}/players/${playerName}/currentQuestionStatus`);
    await set(statusRef, {
      questionId,
      hasAnswered: true,
      answeredAt: Date.now()
    });
    
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
}

// Check if all players have answered current question
export async function checkAllPlayersAnswered(gameCode, currentQuestionId) {
  try {
    const playersRef = ref(database, `games/${gameCode}/players`);
    return new Promise((resolve) => {
      onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players) {
          resolve(false);
          return;
        }
        
        const playerNames = Object.keys(players);
        const allAnswered = playerNames.every(playerName => {
          const status = players[playerName].currentQuestionStatus;
          return status && status.questionId === currentQuestionId && status.hasAnswered;
        });
        
        resolve(allAnswered);
      }, { onlyOnce: true });
    });
  } catch (error) {
    console.error('Error checking players answered:', error);
    return false;
  }
}

// Clear all players' answer status for new question
export async function clearPlayersAnswerStatus(gameCode) {
  try {
    const playersRef = ref(database, `games/${gameCode}/players`);
    const snapshot = await new Promise(resolve => onValue(playersRef, resolve, { onlyOnce: true }));
    const players = snapshot.val();
    
    if (players) {
      const updates = {};
      Object.keys(players).forEach(playerName => {
        updates[`${playerName}/currentQuestionStatus`] = {
          hasAnswered: false,
          questionId: null,
          answeredAt: null
        };
      });
      
      const updateRef = ref(database, `games/${gameCode}/players`);
      await update(updateRef, updates);
    }
  } catch (error) {
    console.error('Error clearing answer status:', error);
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

// Create a new custom game session with custom questions
export async function createCustomGame(hostName, customQuestions) {
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
      startTime: null,
      gameType: 'custom',
      customQuestions: customQuestions || []
    };

    await set(gameRef, gameData);
    return gameCode;
  } catch (error) {
    console.error('Error creating custom game:', error);
    throw error;
  }
}

// Upload image to Firebase Storage
export async function uploadQuestionImage(file, gameCode, questionIndex) {
  try {
    await ensureAuth();
    const fileName = `games/${gameCode}/questions/${questionIndex}_${Date.now()}.${file.name.split('.').pop()}`;
    const imageRef = storageRef(storage, fileName);
    
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Save custom questions to database
export async function saveCustomQuestions(gameCode, questions) {
  try {
    await ensureAuth();
    const questionsRef = ref(database, `games/${gameCode}/customQuestions`);
    await set(questionsRef, questions);
  } catch (error) {
    console.error('Error saving custom questions:', error);
    throw error;
  }
}

// Get custom questions from database
export async function getCustomQuestions(gameCode, callback) {
  try {
    const questionsRef = ref(database, `games/${gameCode}/customQuestions`);
    onValue(questionsRef, callback);
  } catch (error) {
    console.error('Error getting custom questions:', error);
    throw error;
  }
}

// Authentication functions
export async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function isUserSignedIn() {
  return !!auth.currentUser && !auth.currentUser.isAnonymous;
}
