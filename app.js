// Firebase Configuration
// قم بنسخ هذه الإعدادات من Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    // قم بتعديل هذه القيم بإعدادات مشروعك
    apiKey: 'AIzaSyCCHimE-uzMAWXucQ82xmt1oiBsvU0OKTw',
    appId: '1:898578384275:android:926b2ab79b58723920d466',
    messagingSenderId: 'ضع-رقم-المرسل-هنا',
    projectId: 'restorant-81e27',
    authDomain: 'fatwra.firebaseapp.com',
    storageBucket: 'fatwra.appspot.com',
};

// مثال للإعدادات (لا تستخدم هذه القيم):
// const firebaseConfig = {
//     apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz",
//     authDomain: "invoice-system-12345.firebaseapp.com",
//     projectId: "invoice-system-12345",
//     storageBucket: "invoice-system-12345.appspot.com",
//     messagingSenderId: "123456789012",
//     appId: "1:123456789012:web:abcdef1234567890"
// };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let users = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('status-filter').addEventListener('change', filterUsers);
    document.getElementById('search-users').addEventListener('input', filterUsers);
}

// Navigation Functions
function showDashboard() {
    document.getElementById('page-title').textContent = 'الإحصائيات';
    document.getElementById('dashboard-content').style.display = 'block';
    document.getElementById('users-content').style.display = 'none';
    document.getElementById('settings-content').style.display = 'none';
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link').classList.add('active');
    
    loadDashboard();
}

function showUsers() {
    document.getElementById('page-title').textContent = 'إدارة المستخدمين';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('users-content').style.display = 'block';
    document.getElementById('settings-content').style.display = 'none';
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.nav-link')[1].classList.add('active');
    
    loadUsers();
}

function showSettings() {
    document.getElementById('page-title').textContent = 'الإعدادات';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('users-content').style.display = 'none';
    document.getElementById('settings-content').style.display = 'block';
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.nav-link')[2].classList.add('active');
    
    loadSettings();
}

// Dashboard Functions
async function loadDashboard() {
    try {
        const usersSnapshot = await db.collection('users').get();
        users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateStats();
        loadRecentUsers();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('خطأ في تحميل البيانات', 'danger');
    }
}

function updateStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive && !isExpired(user)).length;
    const pendingUsers = users.filter(user => !user.isActive).length;
    const expiredUsers = users.filter(user => user.isActive && isExpired(user)).length;

    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('active-users').textContent = activeUsers;
    document.getElementById('pending-users').textContent = pendingUsers;
    document.getElementById('expired-users').textContent = expiredUsers;
}

function loadRecentUsers() {
    const recentUsers = users.slice(0, 5);
    const container = document.getElementById('recent-users-list');
    
    if (recentUsers.length === 0) {
        container.innerHTML = '<p class="text-muted">لا يوجد مستخدمين</p>';
        return;
    }

    container.innerHTML = recentUsers.map(user => `
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
            <div>
                <h6 class="mb-1">${user.name || 'مستخدم بدون اسم'}</h6>
                <small class="text-muted">${user.email}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge ${getStatusBadgeClass(user)}">${getStatusText(user)}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="openUserModal('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Users Functions
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('خطأ في تحميل المستخدمين', 'danger');
    }
}

function displayUsers(usersToShow) {
    const container = document.getElementById('users-list');
    
    if (usersToShow.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">لا يوجد مستخدمين</p>';
        return;
    }

    container.innerHTML = usersToShow.map(user => `
        <div class="card user-card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <h6 class="mb-1">${user.name || 'مستخدم بدون اسم'}</h6>
                        <small class="text-muted">${user.email}</small>
                    </div>
                    <div class="col-md-2">
                        <span class="badge ${getStatusBadgeClass(user)}">${getStatusText(user)}</span>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">
                            ${user.subscriptionType === 'monthly' ? 'شهري' : 
                              user.subscriptionType === 'yearly' ? 'سنوي' : 'لا يوجد'}
                        </small>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">
                            ${user.expiresAt ? formatDate(user.expiresAt.toDate()) : 'غير محدد'}
                        </small>
                    </div>
                    <div class="col-md-3">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="openUserModal('${user.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${user.isActive ? 
                                `<button class="btn btn-outline-warning" onclick="deactivateUser('${user.id}')">
                                    <i class="fas fa-pause"></i>
                                </button>` :
                                `<button class="btn btn-outline-success" onclick="activateUser('${user.id}')">
                                    <i class="fas fa-play"></i>
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterUsers() {
    const statusFilter = document.getElementById('status-filter').value;
    const searchTerm = document.getElementById('search-users').value.toLowerCase();

    let filteredUsers = users;

    // Filter by status
    if (statusFilter) {
        filteredUsers = filteredUsers.filter(user => {
            if (statusFilter === 'active') return user.isActive && !isExpired(user);
            if (statusFilter === 'pending') return !user.isActive;
            if (statusFilter === 'expired') return user.isActive && isExpired(user);
            return true;
        });
    }

    // Filter by search
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            (user.name && user.name.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
    }

    displayUsers(filteredUsers);
}

// User Modal Functions
function openUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    currentUser = user;
    
    document.getElementById('user-info').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>الاسم:</strong> ${user.name || 'غير محدد'}</p>
                <p><strong>البريد الإلكتروني:</strong> ${user.email}</p>
                <p><strong>تاريخ التسجيل:</strong> ${formatDate(user.createdAt.toDate())}</p>
            </div>
            <div class="col-md-6">
                <p><strong>الحالة:</strong> <span class="badge ${getStatusBadgeClass(user)}">${getStatusText(user)}</span></p>
                <p><strong>نوع الاشتراك:</strong> ${user.subscriptionType === 'monthly' ? 'شهري' : user.subscriptionType === 'yearly' ? 'سنوي' : 'لا يوجد'}</p>
                <p><strong>تاريخ الانتهاء:</strong> ${user.expiresAt ? formatDate(user.expiresAt.toDate()) : 'غير محدد'}</p>
            </div>
        </div>
    `;

    document.getElementById('subscription-type').value = user.subscriptionType || 'monthly';

    const modal = new bootstrap.Modal(document.getElementById('userActionModal'));
    modal.show();
}

async function activateUser() {
    if (!currentUser) return;

    const subscriptionType = document.getElementById('subscription-type').value;
    
    try {
        const now = new Date();
        let expiresAt;
        
        if (subscriptionType === 'monthly') {
            expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        } else {
            expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        }

        await db.collection('users').doc(currentUser.id).update({
            isActive: true,
            activatedAt: firebase.firestore.Timestamp.fromDate(now),
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
            subscriptionType: subscriptionType,
            status: 'active'
        });

        showAlert('تم تفعيل المستخدم بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('userActionModal')).hide();
        loadUsers();
        loadDashboard();
    } catch (error) {
        console.error('Error activating user:', error);
        showAlert('خطأ في تفعيل المستخدم', 'danger');
    }
}

async function renewSubscription() {
    if (!currentUser) return;

    const subscriptionType = document.getElementById('subscription-type').value;
    
    try {
        const now = new Date();
        let expiresAt;
        
        if (subscriptionType === 'monthly') {
            expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        } else {
            expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        }

        await db.collection('users').doc(currentUser.id).update({
            isActive: true,
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
            subscriptionType: subscriptionType,
            status: 'active'
        });

        showAlert('تم تجديد الاشتراك بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('userActionModal')).hide();
        loadUsers();
        loadDashboard();
    } catch (error) {
        console.error('Error renewing subscription:', error);
        showAlert('خطأ في تجديد الاشتراك', 'danger');
    }
}

async function deactivateUser() {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.id).update({
            isActive: false,
            status: 'expired'
        });

        showAlert('تم إيقاف تفعيل المستخدم بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('userActionModal')).hide();
        loadUsers();
        loadDashboard();
    } catch (error) {
        console.error('Error deactivating user:', error);
        showAlert('خطأ في إيقاف تفعيل المستخدم', 'danger');
    }
}

// Settings Functions
function loadSettings() {
    // Load saved settings from localStorage or database
    const monthlyPrice = localStorage.getItem('monthly-price') || '50';
    const yearlyPrice = localStorage.getItem('yearly-price') || '500';
    const whatsappNumber = localStorage.getItem('whatsapp-number') || '+21600000000';
    const phoneNumber = localStorage.getItem('phone-number') || '+21600000000';

    document.getElementById('monthly-price').value = monthlyPrice;
    document.getElementById('yearly-price').value = yearlyPrice;
    document.getElementById('whatsapp-number').value = whatsappNumber;
    document.getElementById('phone-number').value = phoneNumber;
}

function savePrices() {
    const monthlyPrice = document.getElementById('monthly-price').value;
    const yearlyPrice = document.getElementById('yearly-price').value;

    localStorage.setItem('monthly-price', monthlyPrice);
    localStorage.setItem('yearly-price', yearlyPrice);

    showAlert('تم حفظ الأسعار بنجاح', 'success');
}

function saveContact() {
    const whatsappNumber = document.getElementById('whatsapp-number').value;
    const phoneNumber = document.getElementById('phone-number').value;

    localStorage.setItem('whatsapp-number', whatsappNumber);
    localStorage.setItem('phone-number', phoneNumber);

    showAlert('تم حفظ معلومات التواصل بنجاح', 'success');
}

// Utility Functions
function isExpired(user) {
    if (!user.isActive || !user.expiresAt) return true;
    return new Date() > user.expiresAt.toDate();
}

function getStatusText(user) {
    if (!user.isActive) return 'في الانتظار';
    if (isExpired(user)) return 'منتهي الصلاحية';
    return 'مفعل';
}

function getStatusBadgeClass(user) {
    if (!user.isActive) return 'bg-warning';
    if (isExpired(user)) return 'bg-danger';
    return 'bg-success';
}

function formatDate(date) {
    return date.toLocaleDateString('ar-TN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

function logout() {
    // Clear any stored data
    localStorage.clear();
    // Redirect to login or show login form
    alert('تم تسجيل الخروج بنجاح');
} 