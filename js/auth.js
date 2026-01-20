class AuthManager {
    constructor() {
        this.USERS_KEY = 'users_data';
        this.CURRENT_USER_KEY = 'current_user';
    }

    signup(name, email, password) {
        const users = this.getAllUsers();
        
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email already registered!' };
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            profilePicture: null
        };

        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        return { success: true, message: 'Account created successfully!' };
    }

    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return { success: false, message: 'Email not found!' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, message: 'Incorrect password!' };
        }

        this.setCurrentUser(email);
        return { success: true, message: 'Login successful!' };
    }

    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
    }

    getCurrentUser() {
        const email = localStorage.getItem(this.CURRENT_USER_KEY);
        if (!email) return null;

        const users = this.getAllUsers();
        return users.find(u => u.email === email) || null;
    }

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    setCurrentUser(email) {
        localStorage.setItem(this.CURRENT_USER_KEY, email);
    }

    getAllUsers() {
        const stored = localStorage.getItem(this.USERS_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    updateUser(email, updates) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex === -1) return false;

        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        return true;
    }

    changePassword(email, currentPassword, newPassword) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);

        if (!user) return { success: false, message: 'User not found!' };

        if (!this.verifyPassword(currentPassword, user.password)) {
            return { success: false, message: 'Current password is incorrect!' };
        }

        user.password = this.hashPassword(newPassword);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        return { success: true, message: 'Password changed successfully!' };
    }

    hashPassword(password) {
        return btoa(password);
    }

    verifyPassword(password, hash) {
        return btoa(password) === hash;
    }

    getUserAssignmentKey(email) {
        return `assignments_${email}`;
    }
}

const authManager = new AuthManager();

function checkAuthentication() {
    if (!authManager.isLoggedIn()) {
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');
        const loginPath = isInPagesFolder ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
        return false;
    }
    return true;
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}
