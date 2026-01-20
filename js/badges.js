let currentUser = null;
let gamificationData = null;

const BADGE_DEFINITIONS = [
    {
        id: 'deadline-warrior',
        name: 'Deadline Warrior',
        icon: '⚔️',
        description: 'Completed 10 assignments',
        requirement: () => getCompletedCount() >= 10
    },
    {
        id: 'early-bird',
        name: 'Early Bird',
        icon: '🌅',
        description: 'Completed 5 assignments early',
        requirement: () => getEarlySubmissionCount() >= 5
    },
    {
        id: 'consistency-king',
        name: 'Consistency King/Queen',
        icon: '👑',
        description: 'Maintained a 7-day streak',
        requirement: () => getMaxStreak() >= 7
    }
];

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthentication()) return;

    currentUser = authManager.getCurrentUser();
    setupTheme();
    loadGamificationData();
    displayBadges();
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
            badges: [],
            completedCount: 0,
            earlySubmissions: 0,
            maxStreak: 0
        };
    }
    
    updateBadgeStatus();
}

function updateBadgeStatus() {
    BADGE_DEFINITIONS.forEach(badge => {
        const earned = gamificationData.badges.find(b => b.id === badge.id);
        
        if (!earned && badge.requirement()) {
            gamificationData.badges.push({
                id: badge.id,
                name: badge.name,
                icon: badge.icon,
                earnedAt: new Date().toISOString()
            });
            saveBadges();
        }
    });
}

function getCompletedCount() {
    const assignmentsKey = `assignments_${currentUser.email}`;
    const assignmentsData = localStorage.getItem(assignmentsKey);
    const assignments = assignmentsData ? JSON.parse(assignmentsData) : [];
    return assignments.filter(a => a.completed).length;
}

function getEarlySubmissionCount() {
    const assignmentsKey = `assignments_${currentUser.email}`;
    const assignmentsData = localStorage.getItem(assignmentsKey);
    const assignments = assignmentsData ? JSON.parse(assignmentsData) : [];
    
    return assignments.filter(a => {
        if (!a.completed) return false;
        const deadline = new Date(a.deadline);
        const completedDate = new Date(a.completedAt || a.createdAt);
        return completedDate < deadline;
    }).length;
}

function getMaxStreak() {
    return gamificationData.maxStreak || 0;
}

function saveBadges() {
    const storageKey = `gamification_${currentUser.email}`;
    localStorage.setItem(storageKey, JSON.stringify(gamificationData));
}

function displayBadges() {
    const earnedBadgesContainer = document.getElementById('earnedBadges');
    const allBadgesContainer = document.getElementById('allBadges');
    
    const earnedBadges = gamificationData.badges;
    const unlockedBadgeIds = earnedBadges.map(b => b.id);
    
    document.getElementById('totalBadges').textContent = earnedBadges.length;
    document.getElementById('completionPercent').textContent = 
        Math.round((earnedBadges.length / BADGE_DEFINITIONS.length) * 100) + '%';
    
    if (earnedBadges.length === 0) {
        earnedBadgesContainer.innerHTML = '<div class="empty-state">No badges earned yet. Start completing assignments!</div>';
    } else {
        earnedBadgesContainer.innerHTML = earnedBadges.map(badge => {
            const badgeDef = BADGE_DEFINITIONS.find(b => b.id === badge.id);
            return `
                <div class="badge-card earned">
                    <span class="badge-icon">${badgeDef.icon}</span>
                    <div class="badge-name">${badgeDef.name}</div>
                    <div class="earned-badge-date">Earned on ${new Date(badge.earnedAt).toLocaleDateString()}</div>
                </div>
            `;
        }).join('');
    }
    
    allBadgesContainer.innerHTML = BADGE_DEFINITIONS.map(badge => {
        const isEarned = unlockedBadgeIds.includes(badge.id);
        const earnedBadge = earnedBadges.find(b => b.id === badge.id);
        
        return `
            <div class="badge-card ${isEarned ? 'earned' : 'locked-badge'}">
                <span class="badge-icon">${badge.icon}</span>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-requirement">${badge.description}</div>
                ${isEarned ? `<div class="earned-badge-date">✓ Earned</div>` : ''}
            </div>
        `;
    }).join('');
}
