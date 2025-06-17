// Game logic and functionality
import { 
    listenToGame, 
    listenToPlayers, 
    startQuiz, 
    sendNextQuestion, 
    submitAnswer as firebaseSubmitAnswer, 
    updatePlayerScore, 
    endGame, 
    getLeaderboard,
    getCustomQuestions,
    checkAllPlayersAnswered,
    clearPlayersAnswerStatus
} from './firebase-config.js';
import { questions, getTotalQuestions } from './questions.js';

// Global game state
let gameState = {
    gameCode: localStorage.getItem('gameCode'),
    userRole: localStorage.getItem('userRole'),
    playerName: localStorage.getItem('playerName'),
    playerEmoji: localStorage.getItem('playerEmoji') || '😊',
    hostName: localStorage.getItem('hostName'),
    currentQuestionIndex: 0,
    playerScore: 0,
    selectedAnswer: null,
    questionStartTime: null,
    gameUnsubscribe: null,
    playersUnsubscribe: null,
    timerInterval: null,
    playersCheckInterval: null,
    isWinner: false,
    customQuestions: [],
    isCustomGame: false,
    hasAnsweredCurrentQuestion: false
};

// Sound effects (optional)
const sounds = {
    correct: null, // Will be replaced with actual sound files
    incorrect: null,
    timer: null
};

// Initialize the appropriate interface based on user role
document.addEventListener('DOMContentLoaded', () => {
    if (!gameState.gameCode) {
        window.location.href = 'index.html';
        return;
    }

    if (gameState.userRole === 'host') {
        initHostInterface();
    } else if (gameState.userRole === 'player') {
        initPlayerInterface();
    }
});

// Host Interface Functions
function initHostInterface() {
    // Update UI with game info
    document.getElementById('game-code').textContent = gameState.gameCode;
    document.getElementById('host-name').textContent = gameState.hostName;
    
    // Listen to game state changes
    gameState.gameUnsubscribe = listenToGame(gameState.gameCode, handleGameStateChange);
    
    // Listen to players
    gameState.playersUnsubscribe = listenToPlayers(gameState.gameCode, handlePlayersChange);
    
    // Set up global functions
    setupHostGlobalFunctions();
}

function handleGameStateChange(snapshot) {
    const game = snapshot.val();
    if (!game) {
        showNotification('لم يعد بإمكان العثور على المسابقة', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    // Check if it's a custom game
    if (game.gameType === 'custom' && game.customQuestions) {
        gameState.isCustomGame = true;
        gameState.customQuestions = game.customQuestions;
        
        // Update total questions display
        const totalQuestionsElement = document.getElementById('total-questions');
        if (totalQuestionsElement) {
            totalQuestionsElement.textContent = game.customQuestions.length;
        }
    }
    
    updateGameStatus(game.status);
    
    if (game.status === 'active') {
        showGameControls();
        if (game.currentQuestion !== undefined) {
            displayCurrentQuestion(game.currentQuestion);
        }
    }
}

function handlePlayersChange(snapshot) {
    const players = snapshot.val();
    const playerCount = players ? Object.keys(players).length : 0;
    
    document.getElementById('player-count').textContent = playerCount;
    
    // Enable/disable start button
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.disabled = playerCount === 0;
    }
    
    // Update players list
    displayPlayersList(players);
    
    // Update answers summary if in active game
    if (players && document.getElementById('answers-grid')) {
        updateAnswersSummary(players);
    }
}

function displayPlayersList(players) {
    const playersContainer = document.getElementById('players-list');
    
    if (!players || Object.keys(players).length === 0) {
        playersContainer.innerHTML = `
            <div class="no-players">
                <i class="fas fa-user-plus"></i>
                <p>في انتظار انضمام المشاركين...</p>
            </div>
        `;
        return;
    }
    
    playersContainer.innerHTML = Object.values(players).map(player => `
        <div class="player-card">
            <div class="player-emoji">${player.emoji || '😊'}</div>
            <div class="player-name">${player.name}</div>
            <div class="player-score">${player.score || 0} نقطة</div>
        </div>
    `).join('');
}

function updateGameStatus(status) {
    const statusElement = document.getElementById('game-status');
    const statusMap = {
        'waiting': 'في الانتظار',
        'active': 'نشطة',
        'finished': 'انتهت'
    };
    statusElement.textContent = statusMap[status] || status;
}

function showGameControls() {
    document.getElementById('waiting-controls').classList.add('hidden');
    document.getElementById('game-controls').classList.remove('hidden');
    
    const totalQuestions = gameState.isCustomGame ? gameState.customQuestions.length : getTotalQuestions();
    const totalQuestionsElement = document.getElementById('total-questions');
    if (totalQuestionsElement) {
        totalQuestionsElement.textContent = totalQuestions;
    }
}

function displayCurrentQuestion(questionIndex) {
    // Determine which questions to use
    const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
    
    if (questionIndex >= currentQuestions.length) {
        // Game finished
        showResults();
        return;
    }
    
    const question = currentQuestions[questionIndex];
    gameState.currentQuestionIndex = questionIndex;
    
    // Update question display
    document.getElementById('current-question-number').textContent = questionIndex + 1;
    document.getElementById('current-question-text').textContent = question.question;
    
    // Display image if exists
    const questionImageContainer = document.getElementById('question-image');
    if (question.image) {
        if (!questionImageContainer) {
            // Create image container if it doesn't exist
            const imageDiv = document.createElement('div');
            imageDiv.id = 'question-image';
            imageDiv.style.textAlign = 'center';
            imageDiv.style.marginBottom = '1rem';
            document.getElementById('current-question-text').parentNode.insertBefore(imageDiv, document.getElementById('current-question-text').nextSibling);
        }
        document.getElementById('question-image').innerHTML = `<img src="${question.image}" alt="صورة السؤال" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
    } else if (questionImageContainer) {
        questionImageContainer.innerHTML = '';
    }
    
    // Display choices based on question type
    const choicesContainer = document.getElementById('choices-display');
    
    if (question.type === 'true-false') {
        choicesContainer.innerHTML = `
            <div class="true-false-choices">
                <div class="choice-item true-false-choice" data-choice="true">
                    <i class="fas fa-check"></i>
                    صحيح
                </div>
                <div class="choice-item true-false-choice" data-choice="false">
                    <i class="fas fa-times"></i>
                    خطأ
                </div>
            </div>
        `;
    } else {
        // Multiple choice or default
        const choices = question.choices || [];
        choicesContainer.innerHTML = choices.map((choice, index) => `
            <div class="choice-item" data-choice="${choice}">
                ${String.fromCharCode(65 + index)}. ${choice}
            </div>
        `).join('');
    }
    
    // Start question timer with host-controlled timing
    startHostControlledTimer(question.timeLimit || 20);
    
    // Clear previous answers
    const answersGrid = document.getElementById('answers-grid');
    if (answersGrid) {
        answersGrid.innerHTML = '';
    }
    
    // Disable next question button initially
    const nextQuestionBtn = document.getElementById('next-question-btn');
    if (nextQuestionBtn) {
        nextQuestionBtn.disabled = true;
        nextQuestionBtn.textContent = 'جاري السؤال...';
    }
    
    // Start checking if all players answered or time expired
    startHostQuestionMonitoring(question.timeLimit || 20);
}

function startQuestionTimer(timeLimit) {
    let timeLeft = timeLimit;
    const timerElement = document.getElementById('timer');
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerElement.style.color = '#dc3545';
            timerElement.style.animation = 'pulse 0.5s infinite';
        }
        
        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timerElement.style.animation = 'none';
            timerElement.style.color = 'inherit';
            
            // Show correct answer
            showCorrectAnswer();
        }
        
        timeLeft--;
    }, 1000);
}

// Host-controlled timer that syncs with Firebase
function startHostControlledTimer(timeLimit) {
    let timeLeft = timeLimit;
    const timerElement = document.getElementById('timer');
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // Set the question start time and end time in Firebase
    const questionStartTime = Date.now();
    const questionEndTime = questionStartTime + (timeLimit * 1000);
    
    gameState.timerInterval = setInterval(() => {
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerElement.style.color = '#dc3545';
            timerElement.style.animation = 'pulse 0.5s infinite';
        }
        
        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timerElement.style.animation = 'none';
            timerElement.style.color = 'inherit';
            
            // Show correct answer
            showCorrectAnswer();
        }
        
        timeLeft--;
    }, 1000);
}

// Synchronized timer that matches host timing exactly
function startSyncedTimer(questionStartTime, questionEndTime) {
    const timerElement = document.getElementById('question-timer');
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    const updateTimer = () => {
        const currentTime = Date.now();
        const timeLeft = Math.max(0, Math.ceil((questionEndTime - currentTime) / 1000));
        
        timerElement.textContent = timeLeft;
        
        // Visual effects for low time
        if (timeLeft <= 5) {
            timerElement.style.color = '#dc3545';
            timerElement.style.animation = 'pulse 0.5s infinite';
        } else {
            timerElement.style.color = 'inherit';
            timerElement.style.animation = 'none';
        }
        
        // Auto-submit when time runs out
        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timerElement.style.animation = 'none';
            timerElement.style.color = 'inherit';
            
            // Auto submit if no answer selected and player hasn't answered yet
            if (!gameState.selectedAnswer && !gameState.hasAnsweredCurrentQuestion) {
                submitCurrentAnswer();
            }
        }
    };
    
    // Update immediately
    updateTimer();
    
    // Update every second
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

// Monitor question status (all players answered OR time expired)
function startHostQuestionMonitoring(timeLimit) {
    // Clear any existing intervals
    if (gameState.playersCheckInterval) {
        clearInterval(gameState.playersCheckInterval);
    }
    
    const questionStartTime = Date.now();
    const questionEndTime = questionStartTime + (timeLimit * 1000);
    
    gameState.playersCheckInterval = setInterval(async () => {
        try {
            const currentTime = Date.now();
            const timeExpired = currentTime >= questionEndTime;
            const allAnswered = await checkAllPlayersAnswered(gameState.gameCode, gameState.currentQuestionIndex);
            const nextQuestionBtn = document.getElementById('next-question-btn');
            
            if (nextQuestionBtn) {
                if (allAnswered) {
                    nextQuestionBtn.disabled = false;
                    nextQuestionBtn.textContent = 'السؤال التالي';
                    clearInterval(gameState.playersCheckInterval);
                } else if (timeExpired) {
                    nextQuestionBtn.disabled = false;
                    nextQuestionBtn.textContent = 'السؤال التالي (انتهى الوقت)';
                    clearInterval(gameState.playersCheckInterval);
                } else {
                    const timeLeft = Math.ceil((questionEndTime - currentTime) / 1000);
                    nextQuestionBtn.textContent = `في انتظار اللاعبين... (${timeLeft}s)`;
                }
            }
        } catch (error) {
            console.error('Error monitoring question:', error);
        }
    }, 1000); // Check every second
}

function showCorrectAnswer() {
    const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
    const question = currentQuestions[gameState.currentQuestionIndex];
    
    if (question.type === 'true-false') {
        const choices = document.querySelectorAll('.true-false-choice');
        choices.forEach(choice => {
            if (choice.dataset.choice === question.correctAnswer.toString()) {
                choice.classList.add('correct');
            }
        });
    } else {
        // Multiple choice
        const choices = document.querySelectorAll('.choice-item');
        choices.forEach(choice => {
            const correctAnswer = typeof question.correctAnswer === 'number' 
                ? question.choices[question.correctAnswer] 
                : question.answer;
            
            if (choice.dataset.choice === correctAnswer) {
                choice.classList.add('correct');
            }
        });
    }
}

function updateAnswersSummary(players) {
    const answersContainer = document.getElementById('answers-grid');
    const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
    const currentQuestion = currentQuestions[gameState.currentQuestionIndex];
    
    if (!currentQuestion) return;
    
    answersContainer.innerHTML = Object.values(players).map(player => {
        const answer = player.answers && player.answers[currentQuestion.id];
        let statusClass = 'no-answer';
        let statusText = 'لم يجب';
        
        if (answer) {
            // Get correct answer based on question type
            let correctAnswer;
            if (currentQuestion.type === 'true-false') {
                correctAnswer = currentQuestion.correctAnswer;
            } else {
                correctAnswer = typeof currentQuestion.correctAnswer === 'number' 
                    ? currentQuestion.choices[currentQuestion.correctAnswer] 
                    : currentQuestion.answer;
            }
            
            if (answer.answer === correctAnswer || answer.answer === correctAnswer.toString()) {
                statusClass = 'correct';
                statusText = 'صحيح';
            } else {
                statusClass = 'incorrect';
                statusText = 'خطأ';
            }
        }
        
        return `
            <div class="answer-item ${statusClass}">
                <div class="player-name">${player.name}</div>
                <div class="answer-status">${statusText}</div>
            </div>
        `;
    }).join('');
}

function setupHostGlobalFunctions() {    // Start game function
    window.startGame = async function() {
        try {
            await startQuiz(gameState.gameCode);
            
            // Get the first question to determine time limit
            const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
            const firstQuestion = currentQuestions[0];
            const timeLimit = firstQuestion ? (firstQuestion.timeLimit || 20) : 20;
            
            await sendNextQuestion(gameState.gameCode, 0, timeLimit);
            showNotification('تم بدء المسابقة بنجاح');
        } catch (error) {
            showNotification('فشل في بدء المسابقة: ' + error.message, 'error');
        }
    };// Next question function
    window.nextQuestion = async function() {
        const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
        const nextIndex = gameState.currentQuestionIndex + 1;
        
        if (nextIndex >= currentQuestions.length) {
            // End game
            await endGame(gameState.gameCode);
            showResults();
            return;
        }
        
        try {
            // Clear player answer statuses for the new question
            await clearPlayersAnswerStatus(gameState.gameCode);
            
            // Get the time limit for the next question
            const nextQuestion = currentQuestions[nextIndex];
            const timeLimit = nextQuestion.timeLimit || 20;
            
            // Send next question with time limit
            await sendNextQuestion(gameState.gameCode, nextIndex, timeLimit);
            
            // Clear the checking interval
            if (gameState.playersCheckInterval) {
                clearInterval(gameState.playersCheckInterval);
            }
            
        } catch (error) {
            showNotification('فشل في إرسال السؤال التالي: ' + error.message, 'error');
        }
    };
    
    // End game function
    window.endGame = async function() {
        if (confirm('هل أنت متأكد من إنهاء المسابقة؟')) {
            try {
                await endGame(gameState.gameCode);
                showResults();
            } catch (error) {
                showNotification('فشل في إنهاء المسابقة: ' + error.message, 'error');
            }
        }
    };
    
    // Show results function
    window.showResults = function() {
        document.getElementById('game-controls').classList.add('hidden');
        document.getElementById('results-section').classList.remove('hidden');
        
        // Get final leaderboard
        getLeaderboard(gameState.gameCode, (leaderboard) => {
            displayLeaderboard(leaderboard, 'final-leaderboard');
        });
    };
    
    // Copy game code function
    window.copyGameCode = function() {
        navigator.clipboard.writeText(gameState.gameCode).then(() => {
            showNotification('تم نسخ رمز المسابقة');
        });
    };
    
    // New game function
    window.newGame = function() {
        localStorage.clear();
        window.location.href = 'index.html';
    };
    
    // Go home function
    window.goHome = function() {
        if (gameState.gameUnsubscribe) gameState.gameUnsubscribe();
        if (gameState.playersUnsubscribe) gameState.playersUnsubscribe();
        localStorage.clear();
        window.location.href = 'index.html';
    };
}

// Player Interface Functions
function initPlayerInterface() {
    // Update UI with player info
    document.getElementById('player-name-display').textContent = gameState.playerName;
    document.getElementById('player-emoji-display').textContent = gameState.playerEmoji;
    document.getElementById('game-code-small').textContent = gameState.gameCode;
    
    // Listen to game state changes
    gameState.gameUnsubscribe = listenToGame(gameState.gameCode, handlePlayerGameStateChange);
    
    // Listen to players for count
    gameState.playersUnsubscribe = listenToPlayers(gameState.gameCode, handlePlayerPlayersChange);
    
    // Set up global functions
    setupPlayerGlobalFunctions();
}

function handlePlayerGameStateChange(snapshot) {
    const game = snapshot.val();
    if (!game) {
        showDisconnectedScreen();
        return;
    }
    
    // Check if it's a custom game
    if (game.gameType === 'custom' && game.customQuestions) {
        gameState.isCustomGame = true;
        gameState.customQuestions = game.customQuestions;
    }
    
    if (game.status === 'waiting') {
        showWaitingScreen();
    } else if (game.status === 'active') {
        if (game.currentQuestion !== undefined) {
            // Check if this is a new question or if player already answered
            const currentQuestionIndex = game.currentQuestion;
            
            // If it's a new question, reset the answered state
            if (currentQuestionIndex !== gameState.currentQuestionIndex) {
                gameState.hasAnsweredCurrentQuestion = false;
                gameState.currentQuestionIndex = currentQuestionIndex;
            }
            
            // Get timer information from host
            const questionStartTime = game.questionStartTime;
            const questionTimeLimit = game.questionTimeLimit || 20;
            const questionEndTime = game.questionEndTime;
            
            // Show appropriate screen based on answer status
            if (gameState.hasAnsweredCurrentQuestion) {
                showWaitingForNextScreen();
            } else {
                showQuestionScreen(currentQuestionIndex, questionStartTime, questionTimeLimit, questionEndTime);
            }
        }
    } else if (game.status === 'finished') {
        showFinalResultsScreen();
    }
}

function handlePlayerPlayersChange(snapshot) {
    const players = snapshot.val();
    const playerData = players && players[gameState.playerName];
    
    if (playerData) {
        gameState.playerScore = playerData.score || 0;
        document.getElementById('player-score').textContent = gameState.playerScore;
    }
    
    // Update waiting player count
    const waitingCountElement = document.getElementById('waiting-player-count');
    if (waitingCountElement) {
        waitingCountElement.textContent = players ? Object.keys(players).length : 0;
    }
}

function showWaitingScreen() {
    hideAllScreens();
    document.getElementById('waiting-screen').classList.remove('hidden');
}

function showWaitingForNextScreen() {
    hideAllScreens();
    
    // Try to find existing waiting screen first
    let waitingNextScreen = document.getElementById('waiting-next-screen');
    
    if (!waitingNextScreen) {
        // Create the waiting screen if it doesn't exist
        waitingNextScreen = document.createElement('div');
        waitingNextScreen.id = 'waiting-next-screen';
        waitingNextScreen.className = 'screen';
        waitingNextScreen.innerHTML = `
            <div class="waiting-container">
                <div class="waiting-content">
                    <div class="spinner">
                        <div class="bounce1"></div>
                        <div class="bounce2"></div>
                        <div class="bounce3"></div>
                    </div>
                    <h2>تم إرسال إجابتك بنجاح!</h2>
                    <p>في انتظار باقي اللاعبين...</p>
                    <div class="current-score">
                        <span>النقاط الحالية: </span>
                        <span class="score-value">${gameState.playerScore}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Find a good place to insert it
        const gameContainer = document.querySelector('.container') || document.body;
        gameContainer.appendChild(waitingNextScreen);
    }
    
    // Update the score
    const scoreElement = waitingNextScreen.querySelector('.score-value');
    if (scoreElement) {
        scoreElement.textContent = gameState.playerScore;
    }
    
    // Show the screen
    waitingNextScreen.classList.remove('hidden');
}

function showQuestionScreen(questionIndex, questionStartTime = null, questionTimeLimit = 20, questionEndTime = null) {
    // Determine which questions to use
    const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
    
    if (questionIndex >= currentQuestions.length) return;
    
    const question = currentQuestions[questionIndex];
    
    // Reset state for new question
    if (questionIndex !== gameState.currentQuestionIndex) {
        gameState.hasAnsweredCurrentQuestion = false;
        gameState.selectedAnswer = null;
        gameState.questionStartTime = Date.now();
        gameState.currentQuestionIndex = questionIndex;
    }
    
    // If player has already answered this question, show waiting screen
    if (gameState.hasAnsweredCurrentQuestion) {
        showWaitingForNextScreen();
        return;
    }
    
    hideAllScreens();
    document.getElementById('question-screen').classList.remove('hidden');
    
    // Update question display
    document.getElementById('current-q-num').textContent = questionIndex + 1;
    document.getElementById('total-q-num').textContent = currentQuestions.length;
    document.getElementById('question-text').textContent = question.question;
    
    // Display difficulty if it exists (for default questions)
    const difficultyElement = document.getElementById('question-difficulty');
    if (difficultyElement) {
        if (question.difficulty) {
            difficultyElement.textContent = getDifficultyText(question.difficulty);
            difficultyElement.style.display = 'block';
        } else {
            difficultyElement.style.display = 'none';
        }
    }
    
    // Display image if exists
    const questionImageContainer = document.getElementById('question-image-player');
    if (question.image) {
        if (!questionImageContainer) {
            // Create image container if it doesn't exist
            const imageDiv = document.createElement('div');
            imageDiv.id = 'question-image-player';
            imageDiv.style.textAlign = 'center';
            imageDiv.style.marginBottom = '1rem';
            document.getElementById('question-text').parentNode.insertBefore(imageDiv, document.getElementById('question-text').nextSibling);
        }
        document.getElementById('question-image-player').innerHTML = `<img src="${question.image}" alt="صورة السؤال" style="max-width: 100%; max-height: 250px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
    } else if (questionImageContainer) {
        questionImageContainer.innerHTML = '';
    }
    
    // Display choices based on question type
    const choicesContainer = document.getElementById('choices-container');
    
    if (question.type === 'true-false') {
        choicesContainer.innerHTML = `
            <div class="true-false-choices">
                <div class="true-false-choice" data-choice="true" onclick="selectTrueFalseChoice(true)">
                    <i class="fas fa-check"></i>
                    صحيح
                </div>
                <div class="true-false-choice" data-choice="false" onclick="selectTrueFalseChoice(false)">
                    <i class="fas fa-times"></i>
                    خطأ
                </div>
            </div>
        `;
    } else {
        // Multiple choice or default
        const choices = question.choices || [];
        choicesContainer.innerHTML = choices.map((choice, index) => `
            <button class="choice-btn" data-choice="${choice}" onclick="selectChoice('${choice}')">
                ${String.fromCharCode(65 + index)}. ${choice}
            </button>
        `).join('');
    }
    
    // Start timer - sync with host if timing data is available
    if (questionStartTime && questionEndTime) {
        startSyncedTimer(questionStartTime, questionEndTime);
    } else {
        startPlayerQuestionTimer(questionTimeLimit);
    }
    
    // Reset submit button
    const submitBtn = document.getElementById('submit-answer-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
    }
}

function getDifficultyText(difficulty) {
    const difficultyMap = {
        'easy': 'سهل',
        'medium': 'متوسط',
        'hard': 'صعب'
    };
    return difficultyMap[difficulty] || difficulty;
}

function startPlayerQuestionTimer(timeLimit) {
    let timeLeft = timeLimit;
    const timerElement = document.getElementById('question-timer');
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerElement.style.color = '#dc3545';
            timerElement.style.animation = 'pulse 0.5s infinite';
        }
        
        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timerElement.style.animation = 'none';
            timerElement.style.color = 'inherit';
            
            // Auto submit if no answer selected and player hasn't answered yet
            if (!gameState.selectedAnswer && !gameState.hasAnsweredCurrentQuestion) {
                submitCurrentAnswer();
            }
        }
        
        timeLeft--;
    }, 1000);
}

function showResultScreen(isCorrect, correctAnswer, pointsEarned) {
    hideAllScreens();
    document.getElementById('result-screen').classList.remove('hidden');
    
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const correctAnswerElement = document.getElementById('correct-answer-text');
    const pointsElement = document.getElementById('points-earned');
    
    if (isCorrect) {
        resultIcon.innerHTML = '<i class="fas fa-check-circle correct"></i>';
        resultTitle.textContent = 'إجابة صحيحة!';
        resultTitle.style.color = '#28a745';
        pointsElement.textContent = `+${pointsEarned}`;
        pointsElement.style.color = '#28a745';
        playSound('correct');
    } else {
        resultIcon.innerHTML = '<i class="fas fa-times-circle incorrect"></i>';
        resultTitle.textContent = 'إجابة خاطئة';
        resultTitle.style.color = '#dc3545';
        pointsElement.textContent = '+0';
        pointsElement.style.color = '#dc3545';
        playSound('incorrect');
    }
    
    correctAnswerElement.textContent = correctAnswer;
}

function showFinalResultsScreen() {
    hideAllScreens();
    
    // Get and display leaderboard first to determine if player is winner
    getLeaderboard(gameState.gameCode, (leaderboard) => {
        const playerRank = leaderboard.findIndex(p => p.name === gameState.playerName) + 1;
        
        // Check if player is the winner (1st place)
        if (playerRank === 1 && leaderboard.length > 1) {
            // Show winner screen
            document.getElementById('winner-screen').classList.remove('hidden');
            document.getElementById('winner-name-text').textContent = gameState.playerName;
            document.getElementById('winner-emoji').textContent = gameState.playerEmoji;
            document.getElementById('winner-final-score').textContent = gameState.playerScore;
            
            // Add celebration effects
            createFireworks();
            playSound('correct');
            
            gameState.isWinner = true;
        } else {
            // Show regular final results
            document.getElementById('final-results-screen').classList.remove('hidden');
            document.getElementById('final-score').textContent = gameState.playerScore;
            document.getElementById('final-rank').textContent = `#${playerRank}`;
            displayLeaderboard(leaderboard, 'player-leaderboard');
        }
    });
}

function showDisconnectedScreen() {
    hideAllScreens();
    document.getElementById('disconnected-screen').classList.remove('hidden');
}

function hideAllScreens() {
    const screens = [
        'waiting-screen',
        'waiting-next-screen',
        'question-screen', 
        'result-screen',
        'winner-screen',
        'final-results-screen',
        'disconnected-screen'
    ];
    
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('hidden');
        }
    });
}

function setupPlayerGlobalFunctions() {    // Select choice function
    window.selectChoice = function(choice) {
        gameState.selectedAnswer = choice;
        
        // Update UI
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.querySelector(`[data-choice="${choice}"]`).classList.add('selected');
        const submitBtn = document.getElementById('submit-answer-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    };

    // Select true/false choice function
    window.selectTrueFalseChoice = function(choice) {
        gameState.selectedAnswer = choice;
        
        // Update UI
        document.querySelectorAll('.true-false-choice').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.querySelector(`[data-choice="${choice}"]`).classList.add('selected');
        const submitBtn = document.getElementById('submit-answer-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    };
    
    // Submit answer function
    window.submitAnswer = function() {
        submitCurrentAnswer();
    };
    
    // Reconnect function
    window.reconnect = function() {
        window.location.reload();
    };
    
    // Play again function
    window.playAgain = function() {
        localStorage.removeItem('playerName');
        window.location.href = 'index.html';
    };
    
    // Go home function
    window.goHome = function() {
        if (gameState.gameUnsubscribe) gameState.gameUnsubscribe();
        if (gameState.playersUnsubscribe) gameState.playersUnsubscribe();
        localStorage.clear();
        window.location.href = 'index.html';
    };
    
    // Celebrate again function
    window.celebrateAgain = function() {
        createFireworks();
        playSound('correct');
    };
    
    // View leaderboard function
    window.viewLeaderboard = function() {
        hideAllScreens();
        document.getElementById('final-results-screen').classList.remove('hidden');
        document.getElementById('final-score').textContent = gameState.playerScore;
        
        getLeaderboard(gameState.gameCode, (leaderboard) => {
            const playerRank = leaderboard.findIndex(p => p.name === gameState.playerName) + 1;
            document.getElementById('final-rank').textContent = `#${playerRank}`;
            displayLeaderboard(leaderboard, 'player-leaderboard');
        });
    };
}

// Fireworks animation function
function createFireworks() {
    const fireworksContainer = document.getElementById('fireworks');
    if (!fireworksContainer) return;
    
    // Clear existing fireworks
    fireworksContainer.innerHTML = '';
    
    // Create multiple fireworks
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            createSingleFirework(fireworksContainer);
        }, i * 300);
    }
}

function createSingleFirework(container) {
    const firework = document.createElement('div');
    firework.className = 'firework';
    
    // Random position
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    
    firework.style.left = x + '%';
    firework.style.top = y + '%';
    
    // Random colors
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Create particles
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        particle.style.backgroundColor = color;
        
        const angle = (i * 30) * Math.PI / 180;
        const distance = 50 + Math.random() * 50;
        
        particle.style.setProperty('--x', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--y', Math.sin(angle) * distance + 'px');
        
        firework.appendChild(particle);
    }
    
    container.appendChild(firework);
    
    // Remove after animation
    setTimeout(() => {
        if (firework.parentNode) {
            firework.parentNode.removeChild(firework);
        }
    }, 1000);
}

// Enhanced scoring with speed bonus
async function submitCurrentAnswer() {
    if (gameState.hasAnsweredCurrentQuestion) {
        return; // Already answered this question
    }
    
    const currentQuestions = gameState.isCustomGame ? gameState.customQuestions : questions;
    const question = currentQuestions[gameState.currentQuestionIndex];
    const timeToAnswer = Date.now() - gameState.questionStartTime;
    const answer = gameState.selectedAnswer || '';
    
    // Disable submit button and clear timer
    const submitBtn = document.getElementById('submit-answer-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    try {
        // Submit answer to Firebase
        await firebaseSubmitAnswer(
            gameState.gameCode,
            gameState.playerName,
            gameState.currentQuestionIndex, // Use question index as ID
            answer,
            timeToAnswer
        );
        
        // Mark this question as answered locally
        gameState.hasAnsweredCurrentQuestion = true;
        
        // Calculate score with enhanced speed bonus
        let correctAnswer;
        if (question.type === 'true-false') {
            correctAnswer = question.correctAnswer;
        } else {
            correctAnswer = typeof question.correctAnswer === 'number' 
                ? question.choices[question.correctAnswer] 
                : question.answer;
        }
        
        const isCorrect = answer === correctAnswer || answer === correctAnswer.toString();
        let pointsEarned = 0;
        
        if (isCorrect) {
            // Base points
            const basePoints = question.points || 100;
            
            // Speed bonus - more points for faster answers
            const timeLimit = (question.timeLimit || 20) * 1000;
            const speedRatio = Math.max(0, (timeLimit - timeToAnswer) / timeLimit);
            const speedBonus = Math.floor(basePoints * speedRatio * 0.5); // Up to 50% bonus
            
            pointsEarned = basePoints + speedBonus;
            gameState.playerScore += pointsEarned;
            
            // Update score in Firebase
            await updatePlayerScore(gameState.gameCode, gameState.playerName, gameState.playerScore);
        }
        
        // Show result screen briefly, then show waiting screen
        showResultScreen(isCorrect, correctAnswer, pointsEarned);
        
        // After 3 seconds, show waiting screen
        setTimeout(() => {
            showWaitingForNextScreen();
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        showNotification('فشل في إرسال الإجابة: ' + error.message, 'error');
        
        // Re-enable submit button on error
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

// Utility Functions
function displayLeaderboard(leaderboard, containerId) {
    const container = document.getElementById(containerId);
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد نتائج</p>';
        return;
    }
    
    container.innerHTML = leaderboard.map((player, index) => {
        const isCurrentPlayer = player.name === gameState.playerName;
        let rankClass = '';
        
        if (index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        return `
            <div class="leaderboard-item ${rankClass} ${isCurrentPlayer ? 'me' : ''}">
                <div class="player-info-lb">
                    <div class="rank-badge">${index + 1}</div>
                    <div class="player-emoji-lb">${player.emoji || '😊'}</div>
                    <div class="player-name-lb">${player.name}</div>
                </div>
                <div class="player-score-lb">${player.score} نقطة</div>
            </div>
        `;    }).join('');
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = message;
    notification.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].play().catch(() => {
            // Ignore sound play errors
        });
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameState.gameUnsubscribe) gameState.gameUnsubscribe();
    if (gameState.playersUnsubscribe) gameState.playersUnsubscribe();
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (gameState.playersCheckInterval) clearInterval(gameState.playersCheckInterval);
});

// Export for use in HTML pages
window.gameState = gameState;
