// Admin page: statistics, manage locations, list users and change roles.
const user = requireLogin(["ADMIN"]);

if (user) {
  renderNavbar();

  let usersPage = 1;
  let usersTotalPages = 1;

  // ---------- Statistics + locations table ----------
  async function loadStats() {
    const data = await apiRequest("/admin/stats");

    document.getElementById("stats").innerHTML = `
      <div class="stat-card"><div class="stat-label">Total users</div><div class="stat-value">${data.users.total}</div></div>
      <div class="stat-card"><div class="stat-label">Students</div><div class="stat-value">${data.users.students}</div></div>
      <div class="stat-card"><div class="stat-label">Staff</div><div class="stat-value">${data.users.staff}</div></div>
      <div class="stat-card"><div class="stat-label">Total tickets</div><div class="stat-value">${data.tickets.total}</div></div>
      <div class="stat-card highlight"><div class="stat-label">Waiting now</div><div class="stat-value">${data.tickets.WAITING}</div></div>
      <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${data.tickets.COMPLETED}</div></div>
    `;

    const tableBox = document.getElementById("locations-table");

    if (data.locations.length === 0) {
      tableBox.innerHTML = '<div class="empty-state"><span class="emoji">📍</span>No locations yet. Add one below.</div>';
      return;
    }

    tableBox.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Location</th><th>Avg min</th><th>Waiting</th><th>Being served</th><th>Completed</th><th>Cancelled</th><th></th></tr>
          </thead>
          <tbody>
            ${data.locations
              .map(
                (l) => `<tr>
                  <td><strong>${escapeHtml(l.name)}</strong></td>
                  <td>${l.avgServiceMinutes}</td>
                  <td>${l.waiting}</td>
                  <td>${l.called}</td>
                  <td>${l.completed}</td>
                  <td>${l.cancelled}</td>
                  <td><button class="btn btn-danger btn-small delete-location" data-id="${l.id}">Delete</button></td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  // ---------- Users table (filter + pagination) ----------
  async function loadUsers() {
    const role = document.getElementById("role-filter").value;
    let url = `/admin/users?page=${usersPage}&limit=5`;
    if (role) {
      url += `&role=${role}`;
    }

    const data = await apiRequest(url);
    usersTotalPages = Math.max(data.totalPages, 1);

    const tableBox = document.getElementById("users-table");

    if (data.users.length === 0) {
      tableBox.innerHTML = '<div class="empty-state">No users found.</div>';
    } else {
      tableBox.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              ${data.users
                .map((u) => {
                  // You cannot change your own role, so show a plain badge for yourself
                  const roleCell =
                    u.id === user.id
                      ? `<span class="badge badge-${u.role}">${u.role} (you)</span>`
                      : `<select class="role-select" data-id="${u.id}" style="width: auto">
                           <option value="STUDENT" ${u.role === "STUDENT" ? "selected" : ""}>STUDENT</option>
                           <option value="STAFF" ${u.role === "STAFF" ? "selected" : ""}>STAFF</option>
                           <option value="ADMIN" ${u.role === "ADMIN" ? "selected" : ""}>ADMIN</option>
                         </select>`;
                  return `<tr>
                    <td>${escapeHtml(u.name)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${roleCell}</td>
                    <td>${formatDateTime(u.createdAt)}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;
    }

    document.getElementById("page-info").textContent = `Page ${data.page} of ${usersTotalPages}`;
    document.getElementById("prev-page").disabled = usersPage <= 1;
    document.getElementById("next-page").disabled = usersPage >= usersTotalPages;
  }

  // ---------- Actions ----------
  document.getElementById("location-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    const name = document.getElementById("location-name").value.trim();
    const description = document.getElementById("location-description").value.trim();
    const avgServiceMinutes = document.getElementById("location-minutes").value;

    if (!name) {
      showMessage("Please enter a location name");
      return;
    }

    try {
      const data = await apiRequest("/locations", "POST", { name, description, avgServiceMinutes });
      showMessage(data.message, "success");
      document.getElementById("location-form").reset();
      document.getElementById("location-minutes").value = 5;
      loadStats();
    } catch (error) {
      showMessage(error.message);
    }
  });

  // Delete buttons are created dynamically, so listen on the parent element
  document.getElementById("locations-table").addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-location");
    if (!button) return;

    // read the name from the table row (safer than putting it inside an HTML attribute)
    const name = button.closest("tr").querySelector("strong").textContent;
    if (!confirm(`Delete "${name}"? All tickets of this location will be deleted too.`)) {
      return;
    }

    hideMessage();
    try {
      const data = await apiRequest(`/locations/${button.dataset.id}`, "DELETE");
      showMessage(data.message, "success");
      loadStats();
    } catch (error) {
      showMessage(error.message);
    }
  });

  document.getElementById("users-table").addEventListener("change", async (event) => {
    if (!event.target.classList.contains("role-select")) return;

    hideMessage();
    try {
      const data = await apiRequest(`/admin/users/${event.target.dataset.id}/role`, "PATCH", {
        role: event.target.value,
      });
      showMessage(data.message, "success");
      loadStats();
    } catch (error) {
      showMessage(error.message);
    }
    loadUsers();
  });

  document.getElementById("role-filter").addEventListener("change", () => {
    usersPage = 1;
    loadUsers();
  });
  document.getElementById("prev-page").addEventListener("click", () => {
    usersPage--;
    loadUsers();
  });
  document.getElementById("next-page").addEventListener("click", () => {
    usersPage++;
    loadUsers();
  });

  async function start() {
    try {
      await loadStats();
      await loadUsers();
      // Auto-refresh stats every 5 seconds so live queue movements reflect in real-time
      setInterval(loadStats, 5000);
    } catch (error) {
      showMessage(error.message);
    }
  }

  start();
}
