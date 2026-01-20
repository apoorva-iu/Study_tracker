let currentUser = null;
let timetableData = null;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthentication()) return;

    currentUser = authManager.getCurrentUser();
    setupTheme();
    loadTimetableData();
    setupEventListeners();
    displaySessions();
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
    document.getElementById('addSessionBtn').addEventListener('click', addSession);
    document.getElementById('generateBtn').addEventListener('click', generateTimetable);
    document.getElementById('downloadBtn').addEventListener('click', downloadTimetableAsPDF);
}

function loadTimetableData() {
    const storageKey = `timetable_${currentUser.email}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
        timetableData = JSON.parse(stored);
    } else {
        timetableData = {
            sessions: [],
            schedule: {},
            studyStartTime: '09:00',
            studyEndTime: '21:00',
            preferences: {
                autoGenerate: true,
                balanceLoad: true
            },
            createdAt: new Date().toISOString()
        };
    }
    
    restoreSettings();
}

function restoreSettings() {
    document.getElementById('studyStartTime').value = timetableData.studyStartTime;
    document.getElementById('studyEndTime').value = timetableData.studyEndTime;
    document.getElementById('autoGenerate').checked = timetableData.preferences.autoGenerate;
    document.getElementById('balanceLoad').checked = timetableData.preferences.balanceLoad;
}

function saveTimetableData() {
    const storageKey = `timetable_${currentUser.email}`;
    localStorage.setItem(storageKey, JSON.stringify(timetableData));
}

function addSession() {
    const className = document.getElementById('className').value.trim();
    const day = document.getElementById('daySelect').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!className || !day || !startTime || !endTime) {
        alert('Please fill in all fields!');
        return;
    }
    
    if (startTime >= endTime) {
        alert('End time must be after start time!');
        return;
    }
    
    const session = {
        id: Date.now(),
        name: className,
        day,
        startTime,
        endTime
    };
    
    timetableData.sessions.push(session);
    saveTimetableData();
    clearSessionInputs();
    displaySessions();
}

function clearSessionInputs() {
    document.getElementById('className').value = '';
    document.getElementById('daySelect').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
}

function deleteSession(sessionId) {
    if (confirm('Delete this session?')) {
        timetableData.sessions = timetableData.sessions.filter(s => s.id !== sessionId);
        saveTimetableData();
        displaySessions();
    }
}

function displaySessions() {
    const container = document.getElementById('sessionsList');
    
    if (timetableData.sessions.length === 0) {
        container.innerHTML = '<div class="empty-sessions">No sessions added yet. Add one to get started!</div>';
        return;
    }
    
    container.innerHTML = timetableData.sessions.map(session => `
        <div class="session-card">
            <div class="session-info">
                <div class="session-name">${session.name}</div>
                <div class="session-time">${session.day} • ${session.startTime}-${session.endTime}</div>
            </div>
            <button class="btn-delete" onclick="deleteSession(${session.id})">Remove</button>
        </div>
    `).join('');
}

function generateTimetable() {
    const studyStart = document.getElementById('studyStartTime').value;
    const studyEnd = document.getElementById('studyEndTime').value;
    
    timetableData.studyStartTime = studyStart;
    timetableData.studyEndTime = studyEnd;
    timetableData.preferences.autoGenerate = document.getElementById('autoGenerate').checked;
    timetableData.preferences.balanceLoad = document.getElementById('balanceLoad').checked;
    
    timetableData.schedule = {};
    DAYS.forEach(day => {
        timetableData.schedule[day] = [];
    });
    
    timetableData.sessions.forEach(session => {
        if (!timetableData.schedule[session.day]) {
            timetableData.schedule[session.day] = [];
        }
        timetableData.schedule[session.day].push({
            type: 'class',
            name: session.name,
            startTime: session.startTime,
            endTime: session.endTime
        });
    });
    
    if (timetableData.preferences.autoGenerate) {
        addStudySessions(studyStart, studyEnd);
    }
    
    saveTimetableData();
    displayTimetable();
}

function addStudySessions(startTime, endTime) {
    const assignmentsKey = `assignments_${currentUser.email}`;
    const assignmentsData = localStorage.getItem(assignmentsKey);
    const assignments = assignmentsData ? JSON.parse(assignmentsData) : [];
    
    const pendingAssignments = assignments.filter(a => !a.completed);
    
    if (pendingAssignments.length === 0) return;
    
    const availableDays = DAYS.filter(day => {
        const daySchedule = timetableData.schedule[day] || [];
        return daySchedule.length < 4;
    });
    
    let dayIndex = 0;
    
    pendingAssignments.forEach(assignment => {
        if (availableDays.length === 0) return;
        
        const day = availableDays[dayIndex % availableDays.length];
        const studySession = {
            type: 'study',
            name: `Study: ${assignment.subject}`,
            startTime: addMinutesToTime(startTime, 60 * dayIndex),
            endTime: addMinutesToTime(startTime, 60 * (dayIndex + 1))
        };
        
        if (!timetableData.schedule[day]) {
            timetableData.schedule[day] = [];
        }
        
        timetableData.schedule[day].push(studySession);
        dayIndex++;
    });
}

function addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

function displayTimetable() {
    const scheduleGrid = document.getElementById('scheduleGrid');
    const noTimetableMsg = document.getElementById('noTimetableMsg');
    
    if (Object.keys(timetableData.schedule).length === 0) {
        scheduleGrid.style.display = 'none';
        noTimetableMsg.style.display = 'block';
        return;
    }
    
    scheduleGrid.style.display = 'grid';
    noTimetableMsg.style.display = 'none';
    scheduleGrid.innerHTML = '';
    
    DAYS.forEach(day => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dayColumn.appendChild(dayHeader);
        
        const daySchedule = timetableData.schedule[day] || [];
        daySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        if (daySchedule.length === 0) {
            const emptySlot = document.createElement('div');
            emptySlot.style.textAlign = 'center';
            emptySlot.style.color = '#999';
            emptySlot.style.fontSize = '12px';
            emptySlot.textContent = 'Free day';
            dayColumn.appendChild(emptySlot);
        } else {
            daySchedule.forEach(slot => {
                const timeSlot = document.createElement('div');
                timeSlot.className = `time-slot ${slot.type}`;
                timeSlot.innerHTML = `
                    <div class="time-slot-title">${slot.name}</div>
                    <div class="time-slot-time">${slot.startTime}-${slot.endTime}</div>
                `;
                dayColumn.appendChild(timeSlot);
            });
        }
        
        scheduleGrid.appendChild(dayColumn);
    });
}

function downloadTimetableAsPDF() {
    const element = document.getElementById('scheduleGrid');
    
    if (!element || element.style.display === 'none') {
        alert('Generate timetable first!');
        return;
    }
    
    const opt = {
        margin: 10,
        filename: 'Weekly-Timetable.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
}

window.deleteSession = deleteSession;
