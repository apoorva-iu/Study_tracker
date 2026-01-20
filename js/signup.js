document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupEventListeners();
});

function setupEventListeners() {
    const form = document.getElementById('signupForm');
    if (form) {
        form.addEventListener('submit', handleSignup);
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

function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        showError('errorMessage', 'Please fill in all fields!');
        return;
    }

    if (password.length < 6) {
        showError('errorMessage', 'Password must be at least 6 characters!');
        return;
    }

    if (password !== confirmPassword) {
        showError('errorMessage', 'Passwords do not match!');
        return;
    }

    const result = authManager.signup(name, email, password);

    if (result.success) {
        showSuccess('errorMessage', 'Account created successfully! Redirecting to login...');
        setTimeout(() => {
            const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
            window.location.href = loginPath;
        }, 1500);
    } else {
        showError('errorMessage', result.message);
    }
}
