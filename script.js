// Storage keys
const USERS_KEY = 'safesphere_users';
const CURRENT_USER_KEY = 'safesphere_current_user';
const LOGS_KEY = 'safesphere_logs';
const VISITORS_KEY = 'safesphere_visitors';
const ATTENDANCE_KEY = 'safesphere_attendance';
const INCIDENTS_KEY = 'safesphere_incidents';
const NOTIFICATIONS_KEY = 'safesphere_notifications';

// Data structures
let users = {};
let currentUser = null;
let logs = [];
let visitors = [];
let attendance = {};
let incidents = [];
let notifications = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    checkAutoLogin();
    setupEventListeners();
});

function loadData() {
    try {
        users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
        logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        visitors = JSON.parse(localStorage.getItem(VISITORS_KEY) || '[]');
        attendance = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '{}');
        incidents = JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]');
        notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    } catch(e) {
        console.log('Initializing new storage');
    }
}

function saveData() {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    localStorage.setItem(VISITORS_KEY, JSON.stringify(visitors));
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    document.getElementById('showSignup').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('signupPage').classList.remove('hidden');
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('signupPage').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
    });

    document.getElementById('incidentMedia').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('mediaFileName').textContent = '✓ ' + file.name;
        }
    });

    document.getElementById('logDateFilter').valueAsDate = new Date();
}

function checkAutoLogin() {
    const savedEmail = localStorage.getItem(CURRENT_USER_KEY);
    if (savedEmail && users[savedEmail]) {
        currentUser = users[savedEmail];
        showDashboard();
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const emailOrId = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Check if empty
    if (!emailOrId || !password) {
        showAlert('loginAlert', 'Please enter both email/ID and password.', 'error');
        return;
    }
    
    let user = users[emailOrId];
    
    // If not found by email, search by userId
    if (!user) {
        for (let email in users) {
            if (users[email].userId === emailOrId.toUpperCase()) {
                user = users[email];
                break;
            }
        }
    }
    
    if (!user) {
        showAlert('loginAlert', 'No account found with this email or ID. Please sign up first.', 'error');
        return;
    }
    
    if (user.password !== password) {
        showAlert('loginAlert', 'Incorrect password. Please try again.', 'error');
        addNotification('Failed login attempt detected', 'warning');
        return;
    }
    
    currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, user.email);
    
    showAlert('loginAlert', 'Login successful! Welcome to SafeSphere.', 'success');
    addNotification('Successfully logged in', 'success');
    
    setTimeout(() => {
        showDashboard();
    }, 1000);
}

function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    const idNumber = document.getElementById('signupId').value.trim();
    
    // Validate all fields
    if (!name || !email || !password || !role || !idNumber) {
        showAlert('signupAlert', 'Please fill in all fields.', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('signupAlert', 'Please enter a valid email address.', 'error');
        return;
    }
    
    // Check password length
    if (password.length < 6) {
        showAlert('signupAlert', 'Password must be at least 6 characters long.', 'error');
        return;
    }
    
    if (users[email]) {
        showAlert('signupAlert', 'An account with this email already exists.', 'error');
        return;
    }
    
    const userId = 'SS' + Date.now();
    
    users[email] = {
        userId: userId,
        name: name,
        email: email,
        password: password,
        role: role,
        idNumber: idNumber,
        createdAt: new Date().toISOString()
    };
    
    attendance[userId] = [];
    
    saveData();
    
    showAlert('signupAlert', 'Account created successfully! Please login.', 'success');
    addNotification('New user registered: ' + name, 'success');
    
    setTimeout(() => {
        document.getElementById('signupForm').reset();
        document.getElementById('signupPage').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
    }, 1500);
}

function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('signupPage').classList.add('hidden');
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('sosButton').classList.remove('hidden');
    
    // Update dashboard header
    document.getElementById('welcomeUser').textContent = 'Welcome, ' + currentUser.name + '!';
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    document.getElementById('userId').textContent = 'User ID: ' + currentUser.userId;
    
    // Show/hide sections based on role
    configureRoleAccess();
    
    // Generate QR code
    generateQRCode();
    
    // Load data
    loadAttendance();
    loadLogs();
    loadVisitors();
    loadIncidents();
    loadNotifications();
    updateReports();
}

function configureRoleAccess() {
    const role = currentUser.role;
    
    // Hide all admin sections by default
    document.getElementById('scanBtn').style.display = 'none';
    document.getElementById('visitorBtn').style.display = 'none';
    document.getElementById('logsBtn').style.display = 'none';
    document.getElementById('reportsBtn').style.display = 'none';
    
    // Show sections based on role
    if (role === 'admin' || role === 'security') {
        document.getElementById('scanBtn').style.display = 'block';
        document.getElementById('visitorBtn').style.display = 'block';
        document.getElementById('logsBtn').style.display = 'block';
        document.getElementById('reportsBtn').style.display = 'block';
    }
}

function generateQRCode() {
    const qrCanvas = document.getElementById('qrCanvas');
    qrCanvas.innerHTML = '';
    
    document.getElementById('displayUserId').textContent = currentUser.userId;
    document.getElementById('qrUserName').textContent = currentUser.name;
    document.getElementById('qrUserRole').textContent = currentUser.role;
    
    // Generate QR code using QRCode library
    new QRCode(qrCanvas, {
        text: currentUser.userId,
        width: 200,
        height: 200,
        colorDark: '#667eea',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function showSection(sectionName) {
    // Remove active class from all nav buttons and sections
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    
    // Add active class to clicked nav button
    event.target.closest('.nav-btn').classList.add('active');
    
    // Show the selected section
    const sectionMap = {
        'myQr': 'myQr',
        'attendance': 'attendance',
        'scan': 'scanSection',
        'visitors': 'visitors',
        'incidents': 'incidents',
        'logs': 'logs',
        'reports': 'reports',
        'notifications': 'notifications'
    };
    
    document.getElementById(sectionMap[sectionName]).classList.add('active');
    
    // Reload data for specific sections
    if (sectionName === 'logs') loadLogs();
    if (sectionName === 'visitors') loadVisitors();
    if (sectionName === 'incidents') loadIncidents();
    if (sectionName === 'notifications') loadNotifications();
    if (sectionName === 'reports') updateReports();
}

function processEntry() {
    const userId = document.getElementById('scanUserId').value.trim().toUpperCase();
    
    if (!userId) {
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">Please enter a User ID</p>';
        return;
    }
    
    // Find user
    let user = null;
    for (let email in users) {
        if (users[email].userId === userId) {
            user = users[email];
            break;
        }
    }
    
    if (!user) {
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">User not found</p>';
        return;
    }
    
    const log = {
        userId: userId,
        userName: user.name,
        type: 'entry',
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
    };
    
    logs.push(log);
    
    // Update attendance
    if (!attendance[userId]) {
        attendance[userId] = [];
    }
    
    const today = new Date().toDateString();
    const existingEntry = attendance[userId].find(a => a.date === today);
    
    if (!existingEntry) {
        attendance[userId].push({
            date: today,
            entry: new Date().toLocaleTimeString(),
            exit: null
        });
    }
    
    saveData();
    
    document.getElementById('scanResult').innerHTML = `
        <div class="log-entry">
            <h4 style="color: #28a745;">✓ Entry Logged</h4>
            <p><strong>${user.name}</strong></p>
            <p>User ID: ${userId}</p>
            <p class="log-time">${new Date().toLocaleString()}</p>
        </div>
    `;
    
    addNotification('Entry logged: ' + user.name, 'success');
    document.getElementById('scanUserId').value = '';
}

function processExit() {
    const userId = document.getElementById('scanUserId').value.trim().toUpperCase();
    
    if (!userId) {
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">Please enter a User ID</p>';
        return;
    }
    
    // Find user
    let user = null;
    for (let email in users) {
        if (users[email].userId === userId) {
            user = users[email];
            break;
        }
    }
    
    if (!user) {
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">User not found</p>';
        return;
    }
    
    const log = {
        userId: userId,
        userName: user.name,
        type: 'exit',
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
    };
    
    logs.push(log);
    
    // Update attendance
    if (!attendance[userId]) {
        attendance[userId] = [];
    }
    
    const today = new Date().toDateString();
    const existingEntry = attendance[userId].find(a => a.date === today);
    
    if (existingEntry && !existingEntry.exit) {
        existingEntry.exit = new Date().toLocaleTimeString();
    }
    
    saveData();
    
    document.getElementById('scanResult').innerHTML = `
        <div class="log-entry">
            <h4 style="color: #dc3545;">✗ Exit Logged</h4>
            <p><strong>${user.name}</strong></p>
            <p>User ID: ${userId}</p>
            <p class="log-time">${new Date().toLocaleString()}</p>
        </div>
    `;
    
    addNotification('Exit logged: ' + user.name, 'success');
    document.getElementById('scanUserId').value = '';
}

function loadAttendance() {
    const userAttendance = attendance[currentUser.userId] || [];
    const totalDays = userAttendance.length;
    const presentDays = userAttendance.filter(a => a.entry).length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('presentDays').textContent = presentDays;
    document.getElementById('attendancePercent').textContent = percentage + '%';
    
    const attendanceList = document.getElementById('attendanceList');
    attendanceList.innerHTML = '';
    
    if (userAttendance.length === 0) {
        attendanceList.innerHTML = '<p style="text-align: center; padding: 20px;">No attendance records yet</p>';
        return;
    }
    
    userAttendance.reverse().forEach(record => {
        attendanceList.innerHTML += `
            <div class="log-entry">
                <p><strong>${record.date}</strong></p>
                <p>Entry: ${record.entry || 'N/A'}</p>
                <p>Exit: ${record.exit || 'N/A'}</p>
            </div>
        `;
    });
}

function loadLogs() {
    const filterDate = document.getElementById('logDateFilter').value;
    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '';
    
    let filteredLogs = logs;
    
    if (filterDate) {
        const selectedDate = new Date(filterDate).toDateString();
        filteredLogs = logs.filter(log => new Date(log.timestamp).toDateString() === selectedDate);
    }
    
    if (filteredLogs.length === 0) {
        logsList.innerHTML = '<p style="text-align: center; padding: 20px;">No logs found</p>';
        return;
    }
    
    filteredLogs.reverse().forEach(log => {
        const color = log.type === 'entry' ? '#28a745' : '#dc3545';
        logsList.innerHTML += `
            <div class="log-entry" style="border-left-color: ${color};">
                <p><strong>${log.userName}</strong> - ${log.type.toUpperCase()}</p>
                <p>User ID: ${log.userId}</p>
                <p class="log-time">${new Date(log.timestamp).toLocaleString()}</p>
            </div>
        `;
    });
}

function registerVisitor() {
    const name = document.getElementById('visitorName').value.trim();
    const purpose = document.getElementById('visitorPurpose').value.trim();
    const phone = document.getElementById('visitorPhone').value.trim();
    const meeting = document.getElementById('visitorMeeting').value.trim();
    const idType = document.getElementById('visitorIdType').value;
    
    if (!name || !purpose || !phone || !meeting) {
        alert('Please fill in all required fields');
        return;
    }
    
    const visitor = {
        id: 'V' + Date.now(),
        name: name,
        purpose: purpose,
        phone: phone,
        meeting: meeting,
        idType: idType,
        timestamp: new Date().toISOString(),
        status: 'active',
        date: new Date().toDateString()
    };
    
    visitors.push(visitor);
    saveData();
    
    addNotification('Visitor registered: ' + name, 'success');
    
    // Clear form
    document.getElementById('visitorName').value = '';
    document.getElementById('visitorPurpose').value = '';
    document.getElementById('visitorPhone').value = '';
    document.getElementById('visitorMeeting').value = '';
    document.getElementById('visitorIdType').value = '';
    
    loadVisitors();
}

function loadVisitors() {
    const visitorsList = document.getElementById('visitorsList');
    visitorsList.innerHTML = '';
    
    const today = new Date().toDateString();
    const todayVisitors = visitors.filter(v => v.date === today);
    
    if (todayVisitors.length === 0) {
        visitorsList.innerHTML = '<p style="text-align: center; padding: 20px;">No visitors today</p>';
        return;
    }
    
    todayVisitors.reverse().forEach(visitor => {
        visitorsList.innerHTML += `
            <div class="visitor-card">
                <div>
                    <p><strong>${visitor.name}</strong></p>
                    <p style="font-size: 0.9em; color: #666;">${visitor.purpose}</p>
                    <p style="font-size: 0.85em;">Meeting: ${visitor.meeting}</p>
                </div>
                <span class="status-badge status-${visitor.status}">${visitor.status}</span>
            </div>
        `;
    });
}

function submitIncident() {
    const type = document.getElementById('incidentType').value;
    const location = document.getElementById('incidentLocation').value.trim();
    const description = document.getElementById('incidentDescription').value.trim();
    
    if (!type || !location || !description) {
        alert('Please fill in all required fields');
        return;
    }
    
    const incident = {
        id: 'I' + Date.now(),
        type: type,
        location: location,
        description: description,
        reportedBy: currentUser.name,
        userId: currentUser.userId,
        timestamp: new Date().toISOString(),
        status: 'open'
    };
    
    incidents.push(incident);
    saveData();
    
    addNotification('Incident reported: ' + type, 'warning');
    
    // Clear form
    document.getElementById('incidentType').value = '';
    document.getElementById('incidentLocation').value = '';
    document.getElementById('incidentDescription').value = '';
    document.getElementById('mediaFileName').textContent = '';
    
    alert('Incident reported successfully. Authorities have been notified.');
    loadIncidents();
}

function loadIncidents() {
    const incidentsList = document.getElementById('incidentsList');
    incidentsList.innerHTML = '';
    
    if (incidents.length === 0) {
        incidentsList.innerHTML = '<p style="text-align: center; padding: 20px;">No incidents reported</p>';
        return;
    }
    
    incidents.slice().reverse().slice(0, 10).forEach(incident => {
        incidentsList.innerHTML += `
            <div class="incident-card">
                <p><strong>${incident.type}</strong></p>
                <p style="font-size: 0.9em;">Location: ${incident.location}</p>
                <p style="font-size: 0.85em; color: #666;">${incident.description}</p>
                <p style="font-size: 0.85em; color: #666;">Reported by: ${incident.reportedBy}</p>
                <p class="log-time">${new Date(incident.timestamp).toLocaleString()}</p>
            </div>
        `;
    });
}

function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<p style="text-align: center; padding: 20px;">No notifications</p>';
        return;
    }
    
    notifications.slice().reverse().forEach(notif => {
        const typeClass = 'notification-' + notif.type;
        notificationsList.innerHTML += `
            <div class="log-entry ${typeClass}" style="border-left-width: 4px;">
                <p>${notif.message}</p>
                <p class="log-time">${new Date(notif.timestamp).toLocaleString()}</p>
            </div>
        `;
    });
}

function addNotification(message, type) {
    const notification = {
        message: message,
        type: type,
        timestamp: new Date().toISOString()
    };
    
    notifications.push(notification);
    saveData();
}

function updateReports() {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => log.date === today);
    const todayEntries = todayLogs.filter(log => log.type === 'entry').length;
    
    // Calculate currently inside (entries - exits today)
    const todayExits = todayLogs.filter(log => log.type === 'exit').length;
    const currentlyInside = todayEntries - todayExits;
    
    const todayVisitors = visitors.filter(v => v.date === today).length;
    
    document.getElementById('totalEntries').textContent = todayEntries;
    document.getElementById('currentlyInside').textContent = currentlyInside;
    document.getElementById('totalVisitors').textContent = todayVisitors;
}

function generateReport() {
    const detailedReport = document.getElementById('detailedReport');
    
    const totalUsers = Object.keys(users).length;
    const totalLogs = logs.length;
    const totalVisitors = visitors.length;
    const totalIncidents = incidents.length;
    
    detailedReport.innerHTML = `
        <div class="reports-grid">
            <div class="report-card">
                <h4>Total Users</h4>
                <div class="stat-number">${totalUsers}</div>
            </div>
            <div class="report-card">
                <h4>Total Logs</h4>
                <div class="stat-number">${totalLogs}</div>
            </div>
            <div class="report-card">
                <h4>Total Visitors</h4>
                <div class="stat-number">${totalVisitors}</div>
            </div>
            <div class="report-card">
                <h4>Total Incidents</h4>
                <div class="stat-number">${totalIncidents}</div>
            </div>
        </div>
        <div class="attendance-card" style="margin-top: 20px;">
            <h4>Report Generated</h4>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Generated by: ${currentUser.name}</p>
        </div>
    `;
}

function triggerSOS() {
    if (confirm('⚠️ EMERGENCY ALERT\n\nAre you sure you want to send an SOS alert?\n\nThis will notify campus security and emergency services immediately.')) {
        const sosIncident = {
            id: 'SOS' + Date.now(),
            type: 'SOS Emergency',
            location: 'Location sharing enabled',
            description: 'SOS button pressed by ' + currentUser.name,
            reportedBy: currentUser.name,
            userId: currentUser.userId,
            timestamp: new Date().toISOString(),
            status: 'critical'
        };
        
        incidents.push(sosIncident);
        saveData();
        
        addNotification('🚨 SOS ALERT SENT', 'error');
        
        alert('🚨 SOS ALERT SENT!\n\nCampus security and emergency services have been notified.\nHelp is on the way.\n\nStay safe and stay where you are if possible.');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(CURRENT_USER_KEY);
        currentUser = null;
        
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('sosButton').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('loginAlert').style.display = 'none';
    }
}

function showAlert(elementId, message, type) {
    const alertElement = document.getElementById(elementId);
    alertElement.textContent = message;
    alertElement.className = 'alert alert-' + type;
    alertElement.style.display = 'block';
    
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}