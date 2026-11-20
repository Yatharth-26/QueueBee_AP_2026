// Staff page: view the queue of one location, call next, complete.
const user = requireLogin(["STAFF", "ADMIN"]);

if (user) {
  renderNavbar();

  const locationSelect = document.getElementById("location-select");
  const queueArea = document.getElementById("queue-area");

  let statusFilter = ""; // "" means "active tickets" (WAITING + CALLED)

  // Fill the dropdown with all locations
  async function loadLocations() {
    const data = await apiRequest("/locations");

    if (data.locations.length === 0) {
      queueArea.innerHTML = '<div class="card empty-state">No locations exist yet. Ask the admin to add one.</div>';
      return false;
    }

    const currentVal = locationSelect.value;
    locationSelect.innerHTML = data.locations
      .map((location) => `<option value="${location.id}">${escapeHtml(location.name)}</option>`)
      .join("");

    if (currentVal && [...locationSelect.options].some((o) => o.value === currentVal)) {
      locationSelect.value = currentVal;
    }
    return true;
  }

  // Load and draw the queue of the selected location
  async function loadQueue() {
    const locationId = locationSelect.value;
    if (!locationId) return;

    let url = `/queue/location/${locationId}`;
    if (statusFilter) {
      url += `?status=${statusFilter}`;
    }

    try {
      const data = await apiRequest(url);
      const serving = data.currentTicket;

      const rows = data.tickets
        .map(
          (t) => `<tr>
            <td>#${t.ticketNumber}</td>
            <td>${escapeHtml(t.studentName)}</td>
            <td>${statusBadge(t.status)}</td>
            <td>${formatDateTime(t.createdAt)}</td>
          </tr>`
        )
        .join("");

      queueArea.innerHTML = `
        <div class="grid">
          <div class="stat-card">
            <div class="stat-label">Students waiting</div>
            <div class="stat-value">${data.waitingCount}</div>
          </div>
          <div class="stat-card highlight">
            <div class="stat-label">Now serving</div>
            <div class="stat-value">${serving ? "#" + serving.ticketNumber : "-"}</div>
            <div>${serving ? escapeHtml(serving.studentName) : "Nobody yet"}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg service time</div>
            <div class="stat-value">${data.location.avgServiceMinutes}<span style="font-size: 1rem"> min</span></div>
          </div>
        </div>

        <div class="card" style="margin-top: 20px">
          <div class="hero-buttons" style="justify-content: flex-start">
            <button class="btn btn-big" id="call-next-button" ${serving || data.waitingCount === 0 ? "disabled" : ""}>
              📣 Call next ticket
            </button>
            <button class="btn btn-bee btn-big" id="complete-button" data-id="${serving ? serving.id : ""}" ${serving ? "" : "disabled"}>
              ✅ Complete current
            </button>
          </div>
        </div>

        <div class="card">
          <div style="max-width: 240px; margin-bottom: 12px">
            <select id="status-filter">
              <option value="" ${statusFilter === "" ? "selected" : ""}>Active tickets</option>
              <option value="WAITING" ${statusFilter === "WAITING" ? "selected" : ""}>Waiting only</option>
              <option value="CALLED" ${statusFilter === "CALLED" ? "selected" : ""}>Called only</option>
              <option value="COMPLETED" ${statusFilter === "COMPLETED" ? "selected" : ""}>Completed</option>
              <option value="CANCELLED" ${statusFilter === "CANCELLED" ? "selected" : ""}>Cancelled</option>
            </select>
          </div>
          ${
            data.tickets.length === 0
              ? '<div class="empty-state"><span class="emoji">🎉</span>No tickets to show here.</div>'
              : `<div class="table-wrap"><table>
                   <thead><tr><th>Ticket</th><th>Student</th><th>Status</th><th>Joined</th></tr></thead>
                   <tbody>${rows}</tbody>
                 </table></div>`
          }
        </div>`;
    } catch (error) {
      showMessage(error.message);
    }
  }

  async function callNext() {
    hideMessage();
    try {
      const data = await apiRequest(`/queue/location/${locationSelect.value}/call-next`, "POST");
      showMessage(data.message, "success");
    } catch (error) {
      showMessage(error.message);
    }
    loadQueue();
  }

  async function completeTicket(ticketId) {
    hideMessage();
    try {
      const data = await apiRequest(`/queue/tickets/${ticketId}/complete`, "POST");
      showMessage(data.message, "success");
    } catch (error) {
      showMessage(error.message);
    }
    loadQueue();
  }

  // The queue area is redrawn every few seconds, so we listen on the parent element
  queueArea.addEventListener("click", (event) => {
    const callBtn = event.target.closest("#call-next-button");
    if (callBtn && !callBtn.disabled) {
      callNext();
      return;
    }
    const completeBtn = event.target.closest("#complete-button");
    if (completeBtn && !completeBtn.disabled && completeBtn.dataset.id) {
      completeTicket(completeBtn.dataset.id);
    }
  });

  queueArea.addEventListener("change", (event) => {
    if (event.target.id === "status-filter") {
      statusFilter = event.target.value;
      loadQueue();
    }
  });

  locationSelect.addEventListener("change", loadQueue);

  async function start() {
    try {
      const hasLocations = await loadLocations();
      if (hasLocations) {
        loadQueue();
        setInterval(loadQueue, 5000);
      }
    } catch (error) {
      showMessage(error.message);
    }
  }

  start();
}
