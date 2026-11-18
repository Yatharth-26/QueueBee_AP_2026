// Student dashboard: see my ticket, join/cancel a queue, view history.
const user = requireLogin(["STUDENT"]);
renderNavbar();
document.getElementById("welcome").textContent = "Hello, " + user.name + " 👋";

let hasActiveTicket = false; // true if the student already has a WAITING/CALLED ticket
let historyPage = 1;
let historyTotalPages = 1;

// ---------- 1) My current ticket ----------
async function loadTicket() {
  const data = await apiRequest("/queue/my-ticket");
  const ticket = data.ticket;
  const section = document.getElementById("ticket-section");

  hasActiveTicket = ticket !== null;

  // Empty state: no ticket yet
  if (!ticket) {
    section.innerHTML = `
      <div class="card empty-state">
        <span class="emoji">🎟️</span>
        <h3>You are not in any queue</h3>
        <p>Choose a service below and tap "Join Queue".</p>
      </div>`;
    return;
  }

  const isCalled = ticket.status === "CALLED";
  const callMessage = isCalled
    ? '<div class="alert alert-success">🎉 It is your turn! Please go to the counter now.</div>'
    : "";

  section.innerHTML = `
    <div class="card">
      <h2>Your ticket at ${escapeHtml(ticket.locationName)}</h2>
      ${callMessage}
      <div class="grid">
        <div class="stat-card highlight">
          <div class="stat-label">Ticket number</div>
          <div class="stat-value">#${ticket.ticketNumber}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Position</div>
          <div class="stat-value">${isCalled ? "Now" : ticket.position}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Status</div>
          <div class="stat-value" style="font-size: 1.2rem; padding-top: 8px">${statusBadge(ticket.status)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Estimated wait</div>
          <div class="stat-value">${isCalled ? "0" : ticket.estimatedWaitMinutes}<span style="font-size: 1rem"> min</span></div>
        </div>
      </div>
      ${ticket.status === "WAITING" ? '<div class="form-actions"><button class="btn btn-danger" id="cancel-button">Cancel my ticket</button></div>' : ""}
    </div>`;

  const cancelButton = document.getElementById("cancel-button");
  if (cancelButton) {
    cancelButton.addEventListener("click", cancelTicket);
  }
}

// ---------- 2) List of locations ----------
async function loadLocations() {
  const data = await apiRequest("/locations");
  const container = document.getElementById("locations");

  if (data.locations.length === 0) {
    container.innerHTML = '<div class="card empty-state">No services are available yet.</div>';
    return;
  }

  container.innerHTML = data.locations
    .map(
      (location) => `
      <div class="card" style="margin-bottom: 0">
        <h3>${escapeHtml(location.name)}</h3>
        <p class="muted">${escapeHtml(location.description || "")}</p>
        <p><strong>${location.waitingCount}</strong> waiting<br />
           About <strong>${location.estimatedWaitMinutes} min</strong> if you join now</p>
        <button class="btn join-button" data-id="${location.id}" ${hasActiveTicket ? "disabled" : ""}>
          ${hasActiveTicket ? "You have a ticket" : "Join Queue"}
        </button>
      </div>`
    )
    .join("");
}

// ---------- 3) History with pagination ----------
async function loadHistory() {
  const status = document.getElementById("history-filter").value;
  let url = `/queue/history?page=${historyPage}&limit=5`;
  if (status) {
    url += `&status=${status}`;
  }

  const data = await apiRequest(url);
  historyTotalPages = Math.max(data.totalPages, 1);
  const historyBox = document.getElementById("history");

  if (data.tickets.length === 0) {
    historyBox.innerHTML = '<div class="empty-state">No tickets to show yet.</div>';
  } else {
    historyBox.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticket</th><th>Service</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            ${data.tickets
              .map(
                (t) => `<tr>
                  <td>#${t.ticketNumber}</td>
                  <td>${escapeHtml(t.locationName)}</td>
                  <td>${statusBadge(t.status)}</td>
                  <td>${formatDateTime(t.createdAt)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  document.getElementById("page-info").textContent = `Page ${data.page} of ${historyTotalPages}`;
  document.getElementById("prev-page").disabled = historyPage <= 1;
  document.getElementById("next-page").disabled = historyPage >= historyTotalPages;
}

// ---------- Actions ----------
async function joinQueue(locationId) {
  hideMessage();
  try {
    const data = await apiRequest("/queue/join", "POST", { locationId: locationId });
    showMessage(data.message, "success");
    await refreshAll();
  } catch (error) {
    showMessage(error.message);
  }
}

async function cancelTicket() {
  hideMessage();
  try {
    const data = await apiRequest("/queue/cancel", "POST");
    showMessage(data.message, "info");
    await refreshAll();
  } catch (error) {
    showMessage(error.message);
  }
}

// Loads everything. Ticket first, because the join buttons depend on hasActiveTicket.
async function refreshAll() {
  try {
    await loadTicket();
    await loadLocations();
    await loadHistory();
  } catch (error) {
    showMessage("Could not load data: " + error.message);
  }
}

// ---------- Events ----------
// One click listener for all "Join Queue" buttons (they are created dynamically)
document.getElementById("locations").addEventListener("click", (event) => {
  const button = event.target.closest(".join-button");
  if (button && !button.disabled) {
    joinQueue(Number(button.dataset.id));
  }
});

document.getElementById("prev-page").addEventListener("click", () => {
  historyPage--;
  loadHistory();
});
document.getElementById("next-page").addEventListener("click", () => {
  historyPage++;
  loadHistory();
});
document.getElementById("history-filter").addEventListener("change", () => {
  historyPage = 1;
  loadHistory();
});

refreshAll();
setInterval(refreshAll, 5000); // simple polling: ask the server again every 5 seconds
