// Central API Fetch Helper & Authentication Manager (Vanilla JS)
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const API_BASE = '/api';

/**
 * Storage Helpers
 */
function getToken() {
  return localStorage.getItem('queuebee_token');
}

function getUser() {
  const userStr = localStorage.getItem('queuebee_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

function saveAuth(user, token) {
  localStorage.setItem('queuebee_token', token);
  localStorage.setItem('queuebee_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('queuebee_token');
  localStorage.removeItem('queuebee_user');
  localStorage.removeItem('queuebee_active_queue');
}

function logout() {
  clearAuth();
  window.location.href = '/login.html';
}

/**
 * Robust Central API Request Wrapper
 */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      // If unauthorized on a protected page, log out and redirect
      if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        clearAuth();
        window.location.href = '/login.html?expired=1';
        return;
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP ${response.status}: An error occurred`;
      const err = new Error(errorMsg);
      err.data = data;
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Floating Toast Notification
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Render Dynamic Universal Navbar
 */
function renderNavbar(activePage = '') {
  const navPlaceholder = document.getElementById('navbar-container');
  if (!navPlaceholder) return;

  const user = getUser();

  let actionsHtml = '';
  if (user) {
    let dashboardLink = '/student.html';
    if (user.role === 'STAFF') dashboardLink = '/staff.html';
    if (user.role === 'ADMIN') dashboardLink = '/admin.html';

    actionsHtml = `
      <div class="user-badge">
        <span>👤 ${user.name}</span>
        <span class="role-tag ${user.role.toLowerCase()}">${user.role}</span>
      </div>
      <a href="${dashboardLink}" class="btn btn-secondary btn-sm">Dashboard</a>
      <button onclick="logout()" class="btn btn-secondary btn-sm" title="Log out">Logout</button>
    `;
  } else {
    actionsHtml = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Log In</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }

  navPlaceholder.innerHTML = `
    <nav class="navbar">
      <div class="nav-container">
        <a href="/index.html" class="brand">
          <div class="brand-icon">🐝</div>
          <div>
            <span class="brand-text">QueueBee</span>
            <span class="brand-badge">Smart Queue</span>
          </div>
        </a>
        <div class="nav-actions">
          ${actionsHtml}
        </div>
      </div>
    </nav>
  `;
}
