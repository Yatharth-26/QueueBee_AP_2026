// Helper functions shared by every page (loaded before the page's own script).

const TOKEN_KEY = "queuebee_token";
const USER_KEY = "queuebee_user";

// ---------- Login data is kept in the browser's localStorage ----------
function saveLogin(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const text = localStorage.getItem(USER_KEY);
  return text ? JSON.parse(text) : null;
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "/login.html";
}

// Which dashboard page belongs to which role
function dashboardUrl(role) {
  if (role === "ADMIN") return "/admin.html";
  if (role === "STAFF") return "/staff.html";
  return "/student.html";
}

// Call this at the top of a protected page. If the user is not logged in
// (or has the wrong role) they are sent away. The server checks the role too -
// this only makes the UI friendlier.
function requireLogin(allowedRoles) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = "/login.html";
    return null;
  }
  if (!allowedRoles.includes(user.role)) {
    window.location.href = dashboardUrl(user.role);
    return null;
  }
  return user;
}

// ---------- Talking to the backend ----------
// apiRequest("/queue/join", "POST", { locationId: 1 })  ->  returns the JSON answer
async function apiRequest(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };

  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token; // JWT goes in the Authorization header
  }

  const response = await fetch("/api" + path, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    // response had no JSON body
  }

  // 401 while we hold a token = token expired -> log in again
  if (response.status === 401 && token && !window.location.pathname.includes("login")) {
    logout();
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

// ---------- Small UI helpers ----------

// Shows a message in <div id="message">. type = "error" | "success" | "info"
function showMessage(text, type = "error") {
  const box = document.getElementById("message");
  if (!box) return;
  box.textContent = text;
  box.className = "alert alert-" + type;
}

function hideMessage() {
  const box = document.getElementById("message");
  if (!box) return;
  box.className = "hidden";
}

// Stops user-typed text (like a name) from being run as HTML. Use it whenever
// we put data from the server into innerHTML.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDateTime(isoText) {
  return new Date(isoText).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

// Builds the top navigation bar inside <header id="navbar">
function renderNavbar() {
  const user = getUser();
  let linksHtml = "";

  if (user) {
    linksHtml = `
      <a class="btn btn-light btn-small" href="${dashboardUrl(user.role)}">Dashboard</a>
      ${user.role === "ADMIN" ? '<a class="btn btn-light btn-small" href="/staff.html">Staff Desk</a>' : ""}
      <span class="nav-user">${escapeHtml(user.name)} (${user.role})</span>
      <button class="btn btn-small" onclick="logout()">Logout</button>
    `;
  } else {
    linksHtml = `
      <a class="btn btn-light btn-small" href="/login.html">Login</a>
      <a class="btn btn-small" href="/register.html">Register</a>
    `;
  }

  document.getElementById("navbar").innerHTML = `
    <nav class="navbar">
      <div class="nav-inner">
        <a class="brand" href="/index.html"><span class="brand-icon">🐝</span> QueueBee</a>
        <div class="nav-links">${linksHtml}</div>
      </div>
    </nav>
  `;
}
