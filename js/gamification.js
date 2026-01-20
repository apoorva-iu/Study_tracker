let currentUser = null;
let gamificationData = null;

const XP_CONFIG = {
    COMPLETE_ASSIGNMENT: 25,
    EARLY_SUBMISSION: 50,
    ON_TIME_SUBMISSION: 10,
    STREAK_BONUS: 5
};

const LEVEL_THRESHOLDS = [
    { level: 1, name: '🌱 Novice', min: 0, max: 100 },
    { level: 2, name: '📚 Student', min: 101, max: 300 },
    { level: 3, name: '🎓 Scholar', min: 301, max: 600 },
    { level: 4, name: '🏅 Master', min: 601, max: 1000 },
    { level: 5, name: '👑 Legend', min: 1001, max: Infinity }
];

const BADGES = {
    DEADLINE_WARRIOR: {
        id: 'deadline-warrior',
        name: 'Deadline Warrior',
        icon: '⚔️',
        description: 'Completed 10 assignments',
        requirement: () => gamificationData.completedCount >= 10
    },
    EARLY_BIRD: {
        id: 'early-bird',
        name: 'Early Bird',
        icon: '🌅',
        description: 'Completed 5 assignments early',
        requirement: () => gamificationData.earlySubmissions >= 5
    },
    CONSISTENCY_KING: {
        id: 'consistency-king',
        name: 'Consistency King/Queen',
        icon: '👑',
        description: 'Maintained a 7-day streak',
        requirement: () => gamificationData.maxStreak >= 7
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthentication()) return;

    currentUser = authManager.getCurrentUser();
    setupTheme();
    loadGamificationData();
    displayGamification();
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
    // Event listeners for future features
}

function loadGamificationData() {
    const storageKey = `gamification_${currentUser.email}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
        gamificationData = JSON.parse(stored);
    } else {
        gamificationData = {
            totalXP: 0,
            completedCount: 0,
            onTimeSubmissions: 0,
            earlySubmissions: 0,
            weeklyStreak: 0,
            maxStreak: 0,
            lastActivityDate: null,
            badges: [],
            createdAt: new Date().toISOString()
        };
    }
    
    updateGamificationFromAssignments();
    saveGamificationData();
}

function updateGamificationFromAssignments() {
    const storageKey = `assignments_${currentUser.email}`;
    const assignmentsData = localStorage.getItem(storageKey);
    const assignments = assignmentsData ? JSON.parse(assignmentsData) : [];
    
    const completedAssignments = assignments.filter(a => a.completed);
    gamificationData.completedCount = completedAssignments.length;
    
    let totalXP = 0;
    let onTimeCount = 0;
    let earlyCount = 0;
    
    completedAssignments.forEach(assignment => {
        const deadline = new Date(assignment.deadline);
        const completedDate = new Date(assignment.completedAt || assignment.createdAt);
        
        totalXP += XP_CONFIG.COMPLETE_ASSIGNMENT;
        
        if (completedDate <= deadline) {
            if (completedDate < deadline) {
                earlyCount++;
                totalXP += XP_CONFIG.EARLY_SUBMISSION;
            } else {
                onTimeCount++;
                totalXP += XP_CONFIG.ON_TIME_SUBMISSION;
            }
        }
    });
    
    gamificationData.totalXP = totalXP;
    gamificationData.onTimeSubmissions = onTimeCount;
    gamificationData.earlySubmissions = earlyCount;
    
    updateStreak(completedAssignments);
    checkBadges();
}

function updateStreak(completedAssignments) {
    if (completedAssignments.length === 0) {
        gamificationData.weeklyStreak = 0;
        return;
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastActivityDate = gamificationData.lastActivityDate || today;
    
    if (lastActivityDate === today) {
        return;
    }
    
    const lastDate = new Date(lastActivityDate);
    const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
        gamificationData.weeklyStreak++;
        if (gamificationData.weeklyStreak > gamificationData.maxStreak) {
            gamificationData.maxStreak = gamificationData.weeklyStreak;
        }
    } else if (daysDiff > 1) {
        gamificationData.weeklyStreak = 1;
    }
    
    gamificationData.lastActivityDate = today;
}

function checkBadges() {
    Object.values(BADGES).forEach(badge => {
        const earned = gamificationData.badges.find(b => b.id === badge.id);
        
        if (!earned && badge.requirement()) {
            gamificationData.badges.push({
                id: badge.id,
                name: badge.name,
                icon: badge.icon,
                earnedAt: new Date().toISOString()
            });
        }
    });
}

function getCurrentLevel() {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (gamificationData.totalXP >= LEVEL_THRESHOLDS[i].min) {
            return LEVEL_THRESHOLDS[i];
        }
    }
    return LEVEL_THRESHOLDS[0];
}

function getNextLevel() {
    const currentLevel = getCurrentLevel();
    const nextLevelIndex = LEVEL_THRESHOLDS.findIndex(l => l.level === currentLevel.level) + 1;
    
    if (nextLevelIndex < LEVEL_THRESHOLDS.length) {
        return LEVEL_THRESHOLDS[nextLevelIndex];
    }
    return currentLevel;
}

function getXPProgress() {
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    const currentLevelXP = currentLevel.min;
    const nextLevelXP = nextLevel.min;
    const currentXP = Math.max(0, gamificationData.totalXP - currentLevelXP);
    const requiredXP = nextLevelXP - currentLevelXP;
    
    return {
        current: currentXP,
        required: requiredXP,
        percent: Math.min(100, Math.round((currentXP / requiredXP) * 100))
    };
}

function displayGamification() {
    const currentLevel = getCurrentLevel();
    const progress = getXPProgress();
    
    document.getElementById('totalXP').textContent = gamificationData.totalXP;
    document.getElementById('currentLevel').textContent = currentLevel.level;
    document.getElementById('levelTitle').textContent = currentLevel.name;
    document.getElementById('xpFill').style.width = progress.percent + '%';
    document.getElementById('xpPercent').textContent = progress.percent;
    
    document.getElementById('weeklyStreak').textContent = gamificationData.weeklyStreak;
    
    document.getElementById('completedCount').textContent = gamificationData.completedCount;
    document.getElementById('completedPoints').textContent = gamificationData.completedCount * XP_CONFIG.COMPLETE_ASSIGNMENT;
    
    document.getElementById('onTimeCount').textContent = gamificationData.onTimeSubmissions;
    document.getElementById('onTimePoints').textContent = gamificationData.onTimeSubmissions * XP_CONFIG.ON_TIME_SUBMISSION;
    
    document.getElementById('earlyCount').textContent = gamificationData.earlySubmissions;
    document.getElementById('earlyPoints').textContent = gamificationData.earlySubmissions * XP_CONFIG.EARLY_SUBMISSION;
    
    displayBadges();
}

function displayBadges() {
    const badgesGrid = document.getElementById('badgesGrid');
    const noBadgesMsg = document.getElementById('noBadgesMsg');
    
    const template = document.getElementById('badge-template');
    badgesGrid.innerHTML = '';
    
    if (gamificationData.badges.length === 0) {
        noBadgesMsg.style.display = 'block';
    } else {
        noBadgesMsg.style.display = 'none';
        
        gamificationData.badges.forEach(badge => {
            const badgeElement = template.cloneNode(true);
            badgeElement.id = '';
            badgeElement.style.display = 'block';
            
            const earnedBadgeInfo = Object.values(BADGES).find(b => b.id === badge.id);
            if (earnedBadgeInfo) {
                badgeElement.querySelector('.badge-icon').textContent = earnedBadgeInfo.icon;
                badgeElement.querySelector('.badge-name').textContent = earnedBadgeInfo.name;
                badgeElement.title = `Earned on ${new Date(badge.earnedAt).toLocaleDateString()}`;
            }
            
            badgesGrid.appendChild(badgeElement);
        });
    }
}

function saveGamificationData() {
    const storageKey = `gamification_${currentUser.email}`;
    localStorage.setItem(storageKey, JSON.stringify(gamificationData));
}

function addXP(amount) {
    gamificationData.totalXP += amount;
    saveGamificationData();
    displayGamification();
}

window.addXP = addXP;
