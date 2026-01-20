let assignments = [];
let filteredAssignments = [];
let charts = {};
let draggedElement = null;
let currentFilter = 'all';
let currentSort = 'deadline';

const STORAGE_KEY = 'assignments';
const NOTIFICATION_TIME_MORNING = 8;

document.addEventListener('DOMContentLoaded', () => {
    loadAssignments();
    setupEventListeners();
    initPWA();
    setActivationFilter('all');
    setInterval(updateCountdowns, 1000);
    setInterval(checkNotifications, 60000);
});

function setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', addAssignment);
    document.getElementById('searchBar').addEventListener('input', handleSearch);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('notificationBtn').addEventListener('click', requestNotificationPermission);
    document.getElementById('sortSelect').addEventListener('change', handleSort);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });

    document.getElementById('subject').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addAssignment();
    });
}

function addAssignment() {
    const subject = document.getElementById('subject').value.trim();
    const deadline = document.getElementById('deadline').value;
    const priority = document.getElementById('priority').value;
    const category = document.getElementById('category').value;
    const notes = document.getElementById('notes').value.trim();

    if (!subject || !deadline) {
        showNotification('Please fill in subject and deadline!', 'error');
        return;
    }

    const assignment = {
        id: Date.now(),
        subject,
        deadline,
        priority,
        category,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
    };

    assignments.push(assignment);
    saveAssignments();
    clearInputs();
    applyFilterAndSort();
    updateStats();
    updateCharts();
    showNotification('Assignment added successfully!', 'success');
}

function deleteAssignment(id) {
    if (confirm('Are you sure you want to delete this assignment?')) {
        assignments = assignments.filter(a => a.id !== id);
        saveAssignments();
        applyFilterAndSort();
        updateStats();
        updateCharts();
        showNotification('Assignment deleted!', 'success');
    }
}

function toggleCompletion(id) {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
        assignment.completed = !assignment.completed;
        saveAssignments();
        applyFilterAndSort();
        updateStats();
        updateCharts();
        showNotification(assignment.completed ? 'Assignment marked as completed!' : 'Assignment marked as pending!', 'success');
    }
}

function clearInputs() {
    document.getElementById('subject').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('priority').value = 'high';
    document.getElementById('category').value = 'homework';
    document.getElementById('notes').value = '';
}

function saveAssignments() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

function loadAssignments() {
    const stored = localStorage.getItem(STORAGE_KEY);
    assignments = stored ? JSON.parse(stored) : [];
}

function calculateTimeLeft(deadline) {
    const now = new Date();
    const dueDate = new Date(deadline);
    const diffMs = dueDate - now;

    if (diffMs < 0) {
        return { days: 0, hours: 0, minutes: 0, isOverdue: true };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, isOverdue: false };
}

function getUrgency(deadline, completed) {
    if (completed) return 'completed';
    
    const { days, isOverdue } = calculateTimeLeft(deadline);
    
    if (isOverdue) return 'overdue';
    if (days <= 1) return 'critical';
    if (days <= 3) return 'high';
    if (days <= 5) return 'medium';
    return 'low';
}

function getUrgencyClass(deadline, completed) {
    const urgency = getUrgency(deadline, completed);
    if (urgency === 'overdue') return 'urgency-overdue';
    if (urgency === 'critical') return 'urgency-critical';
    if (urgency === 'high') return 'urgency-high';
    if (urgency === 'medium') return 'urgency-medium';
    return 'urgency-low';
}

function getUrgencyLabel(deadline, completed) {
    const { isOverdue } = calculateTimeLeft(deadline);
    if (completed) return 'Completed';
    if (isOverdue) return 'OVERDUE';
    
    const { days } = calculateTimeLeft(deadline);
    if (days <= 1) return 'URGENT';
    if (days <= 3) return 'SOON';
    if (days <= 5) return 'UPCOMING';
    return 'LATER';
}

function formatCountdown(deadline) {
    const { days, hours, minutes, isOverdue } = calculateTimeLeft(deadline);
    if (isOverdue) {
        const pastMs = new Date() - new Date(deadline);
        const pastDays = Math.floor(pastMs / (1000 * 60 * 60 * 24));
        return `⏰ ${pastDays} day${pastDays !== 1 ? 's' : ''} overdue`;
    }
    return `⏳ ${days}d ${hours}h ${minutes}m left`;
}

function displayAssignments() {
    const listDiv = document.getElementById('assignmentList');
    const emptyState = document.getElementById('emptyState');

    if (filteredAssignments.length === 0) {
        listDiv.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    listDiv.innerHTML = filteredAssignments.map(assignment => `
        <div class="assignment-card ${assignment.completed ? 'completed' : ''}" draggable="true" data-id="${assignment.id}">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(assignment.subject)}</h3>
                <span class="urgency-indicator ${getUrgencyClass(assignment.deadline, assignment.completed)}">
                    ${getUrgencyLabel(assignment.deadline, assignment.completed)}
                </span>
            </div>

            <div class="card-meta">
                <span class="badge badge-${assignment.priority}">${capitalize(assignment.priority)}</span>
                <span class="badge badge-${assignment.category}">${getCategoryEmoji(assignment.category)} ${capitalize(assignment.category)}</span>
                <span class="badge badge-date">📅 ${new Date(assignment.deadline).toLocaleDateString()}</span>
            </div>

            <div class="countdown" data-id="${assignment.id}">${formatCountdown(assignment.deadline)}</div>

            ${assignment.notes ? `<div class="card-notes">📝 ${escapeHtml(assignment.notes)}</div>` : ''}

            <div class="card-actions">
                <button class="btn-action btn-complete ${assignment.completed ? 'completed' : ''}" onclick="toggleCompletion(${assignment.id})">
                    ${assignment.completed ? '✓ Completed' : '◯ Complete'}
                </button>
                <button class="btn-action btn-delete" onclick="deleteAssignment(${assignment.id})">🗑 Delete</button>
            </div>
        </div>
    `).join('');

    setupDragAndDrop();
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.assignment-card');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedElement = card;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedElement = null;
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            const list = document.getElementById('assignmentList');
            const afterElement = getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(draggedElement);
            } else {
                list.insertBefore(draggedElement, afterElement);
            }
        });

        card.addEventListener('drop', () => {
            const draggedId = parseInt(draggedElement.getAttribute('data-id'));
            const targetId = parseInt(card.getAttribute('data-id'));
            reorderAssignments(draggedId, targetId);
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.assignment-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderAssignments(draggedId, targetId) {
    const draggedIndex = assignments.findIndex(a => a.id === draggedId);
    const targetIndex = assignments.findIndex(a => a.id === targetId);
    
    if (draggedIndex > -1 && targetIndex > -1) {
        const [draggedAssignment] = assignments.splice(draggedIndex, 1);
        assignments.splice(targetIndex, 0, draggedAssignment);
        saveAssignments();
    }
}

function applyFilterAndSort() {
    applyFilter(currentFilter);
    applySort(currentSort);
    displayAssignments();
}

function handleFilter(e) {
    const filter = e.target.getAttribute('data-filter');
    setActivationFilter(filter);
}

function setActivationFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });
    applyFilterAndSort();
}

function applyFilter(filter) {
    const now = new Date();

    switch (filter) {
        case 'active':
            filteredAssignments = assignments.filter(a => !a.completed && new Date(a.deadline) >= now);
            break;
        case 'completed':
            filteredAssignments = assignments.filter(a => a.completed);
            break;
        case 'overdue':
            filteredAssignments = assignments.filter(a => !a.completed && new Date(a.deadline) < now);
            break;
        default:
            filteredAssignments = [...assignments];
    }
}

function handleSort(e) {
    currentSort = e.target.value;
    applySort(currentSort);
    displayAssignments();
}

function applySort(sortBy) {
    switch (sortBy) {
        case 'deadline':
            filteredAssignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            break;
        case 'priority':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            filteredAssignments.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'category':
            filteredAssignments.sort((a, b) => a.category.localeCompare(b.category));
            break;
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    if (query === '') {
        applyFilterAndSort();
    } else {
        const searchResults = assignments.filter(a =>
            a.subject.toLowerCase().includes(query) ||
            a.category.toLowerCase().includes(query) ||
            a.notes.toLowerCase().includes(query)
        );
        filteredAssignments = searchResults;
        applySort(currentSort);
        displayAssignments();
    }
}

function updateCountdowns() {
    document.querySelectorAll('.countdown').forEach((el) => {
        const assignmentId = parseInt(el.getAttribute('data-id'));
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
            el.textContent = formatCountdown(assignment.deadline);
        }
    });
}

function updateStats() {
    const now = new Date();
    const completed = assignments.filter(a => a.completed).length;
    const overdue = assignments.filter(a => !a.completed && new Date(a.deadline) < now).length;
    const upcoming = assignments.filter(a => !a.completed && new Date(a.deadline) >= now).length;
    const total = assignments.length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('overdueCount').textContent = overdue;
    document.getElementById('upcomingCount').textContent = upcoming;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('progressPercent').textContent = progress;
    document.getElementById('progressFill').style.width = progress + '%';
}

function updateCharts() {
    updatePriorityChart();
    updateCategoryChart();
    updateTimelineChart();
}

function updatePriorityChart() {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;

    const priorityCounts = {
        high: assignments.filter(a => !a.completed && a.priority === 'high').length,
        medium: assignments.filter(a => !a.completed && a.priority === 'medium').length,
        low: assignments.filter(a => !a.completed && a.priority === 'low').length
    };

    if (charts.priorityChart) charts.priorityChart.destroy();

    charts.priorityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [priorityCounts.high, priorityCounts.medium, priorityCounts.low],
                backgroundColor: ['#ff4b4b', '#ffa534', '#2ecc71'],
                borderColor: ['#ff4b4b', '#ffa534', '#2ecc71'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const categories = ['homework', 'project', 'lab', 'exam', 'other'];
    const categoryCounts = categories.map(cat => 
        assignments.filter(a => !a.completed && a.category === cat).length
    );

    if (charts.categoryChart) charts.categoryChart.destroy();

    charts.categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories.map(capitalize),
            datasets: [{
                data: categoryCounts,
                backgroundColor: [
                    '#9b59b6',
                    '#3498db',
                    '#e67e22',
                    '#c0392b',
                    '#7f8c8d'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;

    const next7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
    });

    const counts = next7Days.map(date => 
        assignments.filter(a => a.deadline === date && !a.completed).length
    );

    if (charts.timelineChart) charts.timelineChart.destroy();

    charts.timelineChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: next7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
                label: 'Assignments Due',
                data: counts,
                backgroundColor: '#4b5bff',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function handleTabSwitch(e) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

    e.target.classList.add('active');
    const tabName = e.target.getAttribute('data-tab');
    document.getElementById(tabName + 'Tab').style.display = 'block';

    if (tabName === 'analytics') {
        setTimeout(() => {
            updateCharts();
        }, 100);
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeToggleButton();
    updateCharts();
}

function updateThemeToggleButton() {
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            showNotification('Notifications already enabled!', 'info');
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotification('Notifications enabled!', 'success');
                    updateNotificationButton();
                }
            });
        } else {
            showNotification('Please enable notifications in browser settings.', 'error');
        }
    } else {
        showNotification('Your browser does not support notifications.', 'error');
    }
}

function updateNotificationButton() {
    const btn = document.getElementById('notificationBtn');
    if (Notification.permission === 'granted') {
        btn.style.opacity = '1';
        btn.title = 'Notifications enabled';
    } else {
        btn.style.opacity = '0.5';
        btn.title = 'Click to enable notifications';
    }
}

function checkNotifications() {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

    assignments.forEach(assignment => {
        if (assignment.completed) return;

        if (assignment.deadline === today) {
            const notifKey = `notif_today_${assignment.id}`;
            if (!localStorage.getItem(notifKey)) {
                sendNotification(`📅 Due Today: ${assignment.subject}`, assignment.subject);
                localStorage.setItem(notifKey, 'true');
            }
        } else if (assignment.deadline === tomorrow) {
            const notifKey = `notif_tomorrow_${assignment.id}`;
            if (!localStorage.getItem(notifKey)) {
                sendNotification(`📅 Due Tomorrow: ${assignment.subject}`, assignment.subject);
                localStorage.setItem(notifKey, 'true');
            }
        }
    });
}

function sendNotification(title, body) {
    new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%234b5bff" width="192" height="192"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="100" fill="white" font-weight="bold">A</text></svg>',
        tag: body,
        requireInteraction: false
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#ff4b4b' : '#4b5bff'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCategoryEmoji(category) {
    const emojis = {
        homework: '📝',
        project: '💻',
        lab: '🧪',
        exam: '📖',
        other: '📌'
    };
    return emojis[category] || '📌';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            console.log('Service Worker registration failed (offline support disabled)');
        });
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeToggleButton();
    updateNotificationButton();
}
