// Game creation functionality
import { createCustomGame, uploadQuestionImage, saveCustomQuestions, onAuthStateChange, isUserSignedIn } from './firebase-config.js';

// Global state
let gameData = {
    hostName: '',
    title: '',
    description: '',
    questions: []
};

let currentQuestionIndex = 0;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    checkAuthentication();
    setupEventListeners();
});

function checkAuthentication() {
    onAuthStateChange((user) => {
        if (!user || user.isAnonymous) {
            // User is not signed in, redirect to main page
            showNotification('يجب تسجيل الدخول أولاً لإنشاء مسابقة مخصصة', 'warning');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // User is authenticated, show the interface
        document.body.style.display = 'block';
        addNewQuestion();
    });
    
    // Hide body initially until auth check is complete
    document.body.style.display = 'none';
}

function setupEventListeners() {
    // Add question button
    document.getElementById('add-question-btn').addEventListener('click', () => {
        addNewQuestion();
    });

    // Create game button
    document.getElementById('create-game-btn').addEventListener('click', createGame);

    // Form inputs
    document.getElementById('host-name').addEventListener('input', (e) => {
        gameData.hostName = e.target.value;
    });

    document.getElementById('game-title').addEventListener('input', (e) => {
        gameData.title = e.target.value;
    });

    document.getElementById('game-description').addEventListener('input', (e) => {
        gameData.description = e.target.value;
    });
}

function addNewQuestion(type = 'multiple-choice') {
    const questionsContainer = document.getElementById('questions-container');
    const questionIndex = gameData.questions.length;
    
    const questionData = {
        id: Date.now(),
        type: type,
        question: '',
        image: null,
        imageFile: null,
        timeLimit: 20,
        points: 100,
        choices: type === 'multiple-choice' ? ['', '', '', ''] : [],
        correctAnswer: type === 'true-false' ? null : 0
    };

    gameData.questions.push(questionData);

    const questionElement = createQuestionElement(questionData, questionIndex);
    questionsContainer.appendChild(questionElement);

    // Scroll to new question
    questionElement.scrollIntoView({ behavior: 'smooth' });
}

function createQuestionElement(questionData, index) {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.dataset.index = index;

    div.innerHTML = `
        <div class="question-header">
            <div class="question-number">${index + 1}</div>
            <div class="question-actions">
                <button class="btn-icon" onclick="moveQuestion(${index}, 'up')" ${index === 0 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button class="btn-icon" onclick="moveQuestion(${index}, 'down')" ${index === gameData.questions.length - 1 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteQuestion(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">نوع السؤال</label>
            <select class="form-select" onchange="changeQuestionType(${index}, this.value)">
                <option value="multiple-choice" ${questionData.type === 'multiple-choice' ? 'selected' : ''}>اختيار متعدد</option>
                <option value="true-false" ${questionData.type === 'true-false' ? 'selected' : ''}>صح أم خطأ</option>
            </select>
        </div>

        <div class="form-group">
            <label class="form-label">نص السؤال</label>
            <textarea class="form-input form-textarea" placeholder="أدخل نص السؤال" 
                onchange="updateQuestion(${index}, 'question', this.value)">${questionData.question}</textarea>
        </div>

        <div class="form-group">
            <label class="form-label">صورة السؤال (اختياري)</label>
            <div class="image-upload ${questionData.image ? 'has-image' : ''}" onclick="selectImage(${index})">
                ${questionData.image ? 
                    `<img src="${questionData.image}" alt="صورة السؤال" class="image-preview">
                     <p>انقر لتغيير الصورة</p>` :
                    `<i class="fas fa-image" style="font-size: 2rem; color: var(--gray-400); margin-bottom: 0.5rem;"></i>
                     <p>انقر لإضافة صورة</p>`
                }
            </div>
            <input type="file" id="image-input-${index}" accept="image/*" style="display: none;" 
                onchange="handleImageSelect(${index}, this)">
        </div>

        <div class="form-group">
            <div style="display: flex; gap: 1rem;">
                <div style="flex: 1;">
                    <label class="form-label">مدة السؤال (ثانية)</label>
                    <input type="number" class="form-input" min="5" max="60" value="${questionData.timeLimit}"
                        onchange="updateQuestion(${index}, 'timeLimit', parseInt(this.value))">
                </div>
                <div style="flex: 1;">
                    <label class="form-label">النقاط</label>
                    <input type="number" class="form-input" min="50" max="500" step="50" value="${questionData.points}"
                        onchange="updateQuestion(${index}, 'points', parseInt(this.value))">
                </div>
            </div>
        </div>

        <div id="answers-container-${index}">
            ${createAnswersSection(questionData, index)}
        </div>
    `;

    return div;
}

function createAnswersSection(questionData, index) {
    if (questionData.type === 'multiple-choice') {
        return `
            <div class="form-group">
                <label class="form-label">الخيارات</label>
                <div class="answer-options">
                    ${questionData.choices.map((choice, choiceIndex) => `
                        <div class="answer-option">
                            <input type="radio" name="correct-${index}" value="${choiceIndex}" 
                                ${questionData.correctAnswer === choiceIndex ? 'checked' : ''}
                                onchange="updateQuestion(${index}, 'correctAnswer', ${choiceIndex})">
                            <input type="text" placeholder="الخيار ${choiceIndex + 1}" value="${choice}"
                                onchange="updateChoice(${index}, ${choiceIndex}, this.value)">
                            ${questionData.choices.length > 2 ? 
                                `<button class="btn-icon danger" onclick="removeChoice(${index}, ${choiceIndex})">
                                    <i class="fas fa-times"></i>
                                </button>` : ''
                            }
                        </div>
                    `).join('')}
                </div>
                ${questionData.choices.length < 6 ? 
                    `<button class="btn btn-secondary" onclick="addChoice(${index})" style="margin-top: 0.5rem;">
                        <i class="fas fa-plus"></i>
                        إضافة خيار
                    </button>` : ''
                }
            </div>
        `;
    } else if (questionData.type === 'true-false') {
        return `
            <div class="form-group">
                <label class="form-label">الإجابة الصحيحة</label>
                <div class="true-false-options">
                    <div class="true-false-option ${questionData.correctAnswer === true ? 'correct selected' : ''}" 
                        onclick="setTrueFalseAnswer(${index}, true)">
                        <i class="fas fa-check" style="color: var(--success-color); font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                        <p>صحيح</p>
                    </div>
                    <div class="true-false-option ${questionData.correctAnswer === false ? 'correct selected' : ''}" 
                        onclick="setTrueFalseAnswer(${index}, false)">
                        <i class="fas fa-times" style="color: var(--secondary-color); font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                        <p>خطأ</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Global functions for event handlers
window.updateQuestion = function(index, field, value) {
    gameData.questions[index][field] = value;
};

window.updateChoice = function(index, choiceIndex, value) {
    gameData.questions[index].choices[choiceIndex] = value;
};

window.addChoice = function(index) {
    gameData.questions[index].choices.push('');
    refreshQuestion(index);
};

window.removeChoice = function(index, choiceIndex) {
    gameData.questions[index].choices.splice(choiceIndex, 1);
    // Adjust correct answer if necessary
    if (gameData.questions[index].correctAnswer >= choiceIndex) {
        gameData.questions[index].correctAnswer = Math.max(0, gameData.questions[index].correctAnswer - 1);
    }
    refreshQuestion(index);
};

window.setTrueFalseAnswer = function(index, value) {
    gameData.questions[index].correctAnswer = value;
    refreshQuestion(index);
};

window.changeQuestionType = function(index, newType) {
    const question = gameData.questions[index];
    question.type = newType;
    
    if (newType === 'multiple-choice') {
        question.choices = ['', '', '', ''];
        question.correctAnswer = 0;
    } else if (newType === 'true-false') {
        question.choices = [];
        question.correctAnswer = null;
    }
    
    refreshQuestion(index);
};

window.selectImage = function(index) {
    document.getElementById(`image-input-${index}`).click();
};

window.handleImageSelect = function(index, input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
            return;
        }

        gameData.questions[index].imageFile = file;
        
        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            gameData.questions[index].image = e.target.result;
            refreshQuestion(index);
        };
        reader.readAsDataURL(file);
    }
};

window.deleteQuestion = function(index) {
    if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
        gameData.questions.splice(index, 1);
        refreshAllQuestions();
    }
};

window.moveQuestion = function(index, direction) {
    const questions = gameData.questions;
    if (direction === 'up' && index > 0) {
        [questions[index], questions[index - 1]] = [questions[index - 1], questions[index]];
    } else if (direction === 'down' && index < questions.length - 1) {
        [questions[index], questions[index + 1]] = [questions[index + 1], questions[index]];
    }
    refreshAllQuestions();
};

function refreshQuestion(index) {
    const questionElement = document.querySelector(`.question-item[data-index="${index}"]`);
    const answersContainer = document.getElementById(`answers-container-${index}`);
    answersContainer.innerHTML = createAnswersSection(gameData.questions[index], index);
}

function refreshAllQuestions() {
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    
    gameData.questions.forEach((question, index) => {
        const questionElement = createQuestionElement(question, index);
        questionsContainer.appendChild(questionElement);
    });
}

async function createGame() {
    // Validate form
    if (!gameData.hostName.trim()) {
        showNotification('يرجى إدخال اسم المقدم', 'error');
        return;
    }

    if (!gameData.title.trim()) {
        showNotification('يرجى إدخال عنوان المسابقة', 'error');
        return;
    }

    if (gameData.questions.length === 0) {
        showNotification('يرجى إضافة سؤال واحد على الأقل', 'error');
        return;
    }

    // Validate questions
    for (let i = 0; i < gameData.questions.length; i++) {
        const question = gameData.questions[i];
        
        if (!question.question.trim()) {
            showNotification(`يرجى إدخال نص السؤال رقم ${i + 1}`, 'error');
            return;
        }        if (question.type === 'multiple-choice') {
            const validChoices = question.choices.filter(choice => choice.trim());
            if (validChoices.length < 2) {
                showNotification(`السؤال رقم ${i + 1} يجب أن يحتوي على خيارين على الأقل`, 'error');
                return;
            }
            if (question.correctAnswer === null || question.correctAnswer === undefined || question.correctAnswer >= validChoices.length) {
                showNotification(`يرجى تحديد الإجابة الصحيحة للسؤال رقم ${i + 1}`, 'error');
                return;
            }
            // Make sure the correct answer index points to a valid choice
            if (!question.choices[question.correctAnswer] || !question.choices[question.correctAnswer].trim()) {
                showNotification(`الإجابة الصحيحة للسؤال رقم ${i + 1} غير صالحة`, 'error');
                return;
            }
        } else if (question.type === 'true-false') {
            if (question.correctAnswer === null || question.correctAnswer === undefined) {
                showNotification(`يرجى تحديد الإجابة الصحيحة للسؤال رقم ${i + 1}`, 'error');
                return;
            }
        }
    }

    try {
        // Show loading
        const createBtn = document.getElementById('create-game-btn');
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';

        // Create custom game
        const gameCode = await createCustomGame(gameData.hostName, []);

        // Upload images and process questions
        const processedQuestions = [];
        for (let i = 0; i < gameData.questions.length; i++) {
            const question = gameData.questions[i];
            let imageUrl = null;

            if (question.imageFile) {
                try {
                    imageUrl = await uploadQuestionImage(question.imageFile, gameCode, i);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    showNotification(`خطأ في رفع صورة السؤال رقم ${i + 1}`, 'warning');
                }
            }            const processedQuestion = {
                id: question.id,
                type: question.type,
                question: question.question.trim(),
                image: imageUrl,
                timeLimit: question.timeLimit,
                points: question.points,
                correctAnswer: question.correctAnswer
            };

            if (question.type === 'multiple-choice') {
                // Filter out empty choices and update correct answer index if needed
                const validChoices = question.choices.filter(choice => choice.trim());
                processedQuestion.choices = validChoices;
                
                // If the correct answer index is beyond the valid choices, adjust it
                if (question.correctAnswer >= validChoices.length) {
                    processedQuestion.correctAnswer = 0; // Default to first choice
                }
            }

            processedQuestions.push(processedQuestion);
        }

        // Save questions to database
        await saveCustomQuestions(gameCode, processedQuestions);

        // Store game info in localStorage
        localStorage.setItem('gameCode', gameCode);
        localStorage.setItem('userRole', 'host');
        localStorage.setItem('hostName', gameData.hostName);
        localStorage.setItem('gameTitle', gameData.title);
        localStorage.setItem('gameDescription', gameData.description);

        showNotification('تم إنشاء المسابقة بنجاح!', 'success');
        
        // Redirect to host panel
        setTimeout(() => {
            window.location.href = 'host.html';
        }, 1500);

    } catch (error) {
        console.error('Error creating game:', error);
        showNotification('حدث خطأ أثناء إنشاء المسابقة', 'error');
        
        // Reset button
        const createBtn = document.getElementById('create-game-btn');
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-play"></i> إنشاء المسابقة';
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}
