document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupEventListeners();
});

function setupEventListeners() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('errorMessage', 'Please fill in all fields!');
        return;
    }

    const result = authManager.login(email, password);

    if (result.success) {
        showSuccess('errorMessage', 'Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : './index.html';
        }, 1500);
    } else {
        showError('errorMessage', result.message);
    }
}
