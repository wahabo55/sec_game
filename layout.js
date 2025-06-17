// Layout and authentication management script
import { 
    signInWithEmail, 
    signOutUser, 
    onAuthStateChange, 
    getCurrentUser, 
    isUserSignedIn 
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    initializeAuthentication();
    initializeLayout();
    initializeEventListeners();
    ensureModalsHidden(); // Add this to ensure modals are hidden on load
});

function ensureModalsHidden() {
    // Make sure all modals are properly hidden on page load
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.add('hidden');
    }
}

function initializeAuthentication() {
    // Listen for auth state changes
    onAuthStateChange((user) => {
        updateAuthUI(user);
        updateAccessibleElements(user);
    });
}

function updateAuthUI(user) {
    const signedOutSection = document.getElementById('signed-out-section');
    const signedInSection = document.getElementById('signed-in-section');
    const userEmailElement = document.getElementById('user-email');

    if (user && !user.isAnonymous) {
        // User is signed in
        signedOutSection.classList.add('hidden');
        signedInSection.classList.remove('hidden');
        userEmailElement.textContent = user.email;
    } else {
        // User is not signed in
        signedOutSection.classList.remove('hidden');
        signedInSection.classList.add('hidden');
    }
}

function updateAccessibleElements(user) {
    const authRequiredElements = document.querySelectorAll('.auth-required');
    const isAuthenticated = user && !user.isAnonymous;

    authRequiredElements.forEach(element => {
        if (isAuthenticated) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

function initializeEventListeners() {
    // Sign in button
    document.getElementById('sign-in-btn')?.addEventListener('click', () => {
        showLoginModal();
    });

    // Sign out button
    document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
        try {
            await signOutUser();
            showNotification('تم تسجيل الخروج بنجاح', 'success');
        } catch (error) {
            showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
        }
    });

    // Login form
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);

    // Auth required elements click protection
    document.querySelectorAll('.auth-required').forEach(element => {
        element.addEventListener('click', (e) => {
            if (!isUserSignedIn()) {
                e.stopPropagation();
                e.preventDefault();
                showNotification('يجب تسجيل الدخول أولاً للوصول لهذه الميزة', 'warning');
                showLoginModal();
            }
        });
    });

    // Close modal when clicking on overlay
    document.getElementById('login-modal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeLoginModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLoginModal();
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
        
        await signInWithEmail(email, password);
        closeLoginModal();
        showNotification('تم تسجيل الدخول بنجاح', 'success');
        
        // Reset form
        e.target.reset();
        
    } catch (error) {
        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'البريد الإلكتروني غير مسجل';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'محاولات كثيرة جداً، حاول مرة أخرى لاحقاً';
                break;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
}

// Modal functions (make them global)
window.showLoginModal = function() {
    document.getElementById('login-modal').classList.remove('hidden');
};

window.closeLoginModal = function() {
    document.getElementById('login-modal').classList.add('hidden');
};

window.showLoginForm = function() {
    showLoginModal();
};

function initializeLayout() {
    // Ensure all sections are properly centered
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.justifyContent = 'center';
        section.style.alignItems = 'center';
        section.style.width = '100%';
    });
      // Special handling for form sections
    const formSections = document.querySelectorAll('#host-section, #player-section');
    formSections.forEach(section => {
        section.style.position = 'fixed';
        section.style.top = '0';
        section.style.left = '0';
        section.style.right = '0';
        section.style.bottom = '0';
        section.style.display = section.classList.contains('hidden') ? 'none' : 'flex';
        section.style.justifyContent = 'center';
        section.style.alignItems = 'center';
        section.style.width = '100vw';
        section.style.height = '100vh';
        section.style.minHeight = '100vh';
        section.style.minWidth = '100vw';
        section.style.zIndex = '1000';
        section.style.backgroundColor = 'rgba(255, 255, 255, 0.97)';
        section.style.padding = '2rem';
    });
      // Handle window resize events
    window.addEventListener('resize', function() {
        const activeSections = document.querySelectorAll('.section:not(.hidden)');
        activeSections.forEach(section => {
            if (section.id === 'host-section' || section.id === 'player-section') {
                section.style.display = 'flex';
                section.style.justifyContent = 'center';
                section.style.alignItems = 'center';
                section.style.minHeight = '100vh';
                section.style.minWidth = '100vw';
            }
        });
    });
}

// Override role selection to check authentication
window.addEventListener('load', () => {
    // Wait a bit to ensure the original selectRole function is defined
    setTimeout(() => {
        const originalSelectRole = window.selectRole;
        window.selectRole = function(role) {
            if (role === 'host' && !isUserSignedIn()) {
                showNotification('يجب تسجيل الدخول أولاً لاستخدام ميزات المقدم', 'warning');
                showLoginModal();
                return;
            }
            
            if (originalSelectRole) {
                originalSelectRole(role);
            } else {
                console.error('Original selectRole function not found');
            }
        };
    }, 100);
});

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    switch (type) {
        case 'success':
            notification.style.background = '#059669';
            break;
        case 'error':
            notification.style.background = '#dc2626';
            break;
        case 'warning':
            notification.style.background = '#d97706';
            break;
        default:
            notification.style.background = '#2563eb';
    }

    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}
