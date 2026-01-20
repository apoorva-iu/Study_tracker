document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthentication()) return;
    
    setupTheme();
    loadProfileData();
    setupEventListeners();
});

function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        updateThemeButton();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
}

function setupEventListeners() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const picInput = document.getElementById('picInput');
    if (picInput) {
        picInput.addEventListener('change', handlePictureUpload);
    }
}

function loadProfileData() {
    const user = authManager.getCurrentUser();
    if (!user) return;

    document.getElementById('fullName').value = user.name;
    document.getElementById('emailInput').value = user.email;

    if (user.profilePicture) {
        document.getElementById('profilePicture').src = user.profilePicture;
    } else {
        document.getElementById('profilePicture').src = `https://api.dicebear.com/9.x/initials/svg?seed=${user.name}`;
    }
    
    loadGamificationStats(user.email);
}

function loadGamificationStats(email) {
    const gamificationKey = `gamification_${email}`;
    const stored = localStorage.getItem(gamificationKey);
    const gamificationData = stored ? JSON.parse(stored) : null;
    
    if (gamificationData) {
        const levelData = getCurrentLevel(gamificationData.totalXP);
        document.getElementById('profileXP').textContent = gamificationData.totalXP || 0;
        document.getElementById('profileLevel').textContent = levelData.level;
        document.getElementById('profileBadges').textContent = (gamificationData.badges || []).length;
    } else {
        document.getElementById('profileXP').textContent = '0';
        document.getElementById('profileLevel').textContent = '1';
        document.getElementById('profileBadges').textContent = '0';
    }
}

function getCurrentLevel(totalXP) {
    const levels = [
        { level: 1, name: '🌱 Novice', min: 0, max: 100 },
        { level: 2, name: '📚 Student', min: 101, max: 300 },
        { level: 3, name: '🎓 Scholar', min: 301, max: 600 },
        { level: 4, name: '🏅 Master', min: 601, max: 1000 },
        { level: 5, name: '👑 Legend', min: 1001, max: Infinity }
    ];
    
    for (let i = levels.length - 1; i >= 0; i--) {
        if (totalXP >= levels[i].min) {
            return levels[i];
        }
    }
    return levels[0];
}

function handlePictureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showError('errorMessage', 'Please upload an image file!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64Image = event.target.result;
        const user = authManager.getCurrentUser();
        authManager.updateUser(user.email, { profilePicture: base64Image });
        document.getElementById('profilePicture').src = base64Image;
        showSuccess('successMessage', 'Profile picture updated!');
    };
    reader.readAsDataURL(file);
}

function handleProfileUpdate(e) {
    e.preventDefault();

    const user = authManager.getCurrentUser();
    const fullName = document.getElementById('fullName').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!fullName) {
        showError('errorMessage', 'Name cannot be empty!');
        return;
    }

    if (newPassword || confirmNewPassword) {
        if (!currentPassword) {
            showError('errorMessage', 'Please enter current password to change password!');
            return;
        }

        if (newPassword.length < 6) {
            showError('errorMessage', 'New password must be at least 6 characters!');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showError('errorMessage', 'New passwords do not match!');
            return;
        }

        const passwordResult = authManager.changePassword(user.email, currentPassword, newPassword);
        if (!passwordResult.success) {
            showError('errorMessage', passwordResult.message);
            return;
        }
    }

    const updateResult = authManager.updateUser(user.email, { name: fullName });
    if (updateResult) {
        showSuccess('successMessage', 'Profile updated successfully!');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    } else {
        showError('errorMessage', 'Failed to update profile!');
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        authManager.logout();
        const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
    }
}
