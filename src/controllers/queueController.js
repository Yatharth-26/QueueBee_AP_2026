// Everything about tickets: students join/cancel/view, staff call and complete.
const prisma = require("../config/prisma");

const ACTIVE_STATUSES = ["WAITING", "CALLED"]; // a ticket that is still "alive"
const ALL_STATUSES = ["WAITING", "CALLED", "COMPLETED", "CANCELLED"];

// ---------- helper ----------
// Adds position and estimated wait time to a ticket (the ticket must include its location).
//   position      = number of WAITING tickets ahead of me + 1
//   estimated wait = position x average service minutes of the location
async function addPositionInfo(ticket) {
  let position = 0;
  let estimatedWaitMinutes = 0;

  if (ticket.status === "WAITING") {
    const peopleAhead = await prisma.queueTicket.count({
      where: {
        locationId: ticket.locationId,
        status: "WAITING",
        ticketNumber: { lt: ticket.ticketNumber }, // lt = "less than"
      },
    });
    position = peopleAhead + 1;
    estimatedWaitMinutes = position * ticket.location.avgServiceMinutes;
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    locationId: ticket.locationId,
    locationName: ticket.location.name,
    position: position,
    estimatedWaitMinutes: estimatedWaitMinutes,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    completedAt: ticket.completedAt,
  };
}

// =====================  STUDENT  =====================

// POST /api/queue/join      body: { locationId }
async function joinQueue(req, res, next) {
  try {
    const locationId = Number(req.body.locationId);
    if (!Number.isInteger(locationId)) {
      return res.status(400).json({ message: "locationId is required" });
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Rule: a student can have only ONE active ticket at a time
    const activeTicket = await prisma.queueTicket.findFirst({
      where: { userId: req.user.id, status: { in: ACTIVE_STATUSES } },
    });
    if (activeTicket) {
      return res.status(409).json({ message: "You already have an active ticket. Cancel it or wait until it is completed" });
    }

    // Next ticket number = highest number in this location + 1
    const lastTicket = await prisma.queueTicket.findFirst({
      where: { locationId: locationId },
      orderBy: { ticketNumber: "desc" },
    });
    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

    const ticket = await prisma.queueTicket.create({
      data: { ticketNumber: nextTicketNumber, userId: req.user.id, locationId: locationId },
      include: { location: true },
    });

    const ticketInfo = await addPositionInfo(ticket);
    res.status(201).json({ message: `You joined the ${location.name} queue`, ticket: ticketInfo });
  } catch (error) {
    next(error);
  }
}

// GET /api/queue/my-ticket     - the student's current ticket (or null)
async function getMyTicket(req, res, next) {
  try {
    const ticket = await prisma.queueTicket.findFirst({
      where: { userId: req.user.id, status: { in: ACTIVE_STATUSES } },
      include: { location: true },
    });

    if (!ticket) {
      return res.json({ ticket: null });
    }

    const ticketInfo = await addPositionInfo(ticket);
    res.json({ ticket: ticketInfo });
  } catch (error) {
    next(error);
  }
}

// POST /api/queue/cancel     - cancel my WAITING ticket
async function cancelMyTicket(req, res, next) {
  try {
    const ticket = await prisma.queueTicket.findFirst({
      where: { userId: req.user.id, status: "WAITING" },
    });

    if (!ticket) {
      return res.status(404).json({ message: "You have no waiting ticket to cancel" });
    }

    await prisma.queueTicket.update({
      where: { id: ticket.id },
      data: { status: "CANCELLED" },
    });

    res.json({ message: "Your ticket was cancelled" });
  } catch (error) {
    next(error);
  }
}

// GET /api/queue/history?page=1&limit=5&status=COMPLETED   - my old tickets
async function getMyHistory(req, res, next) {
  try {
    // Pagination: page 1 = first 5 rows, page 2 = next 5 rows ...
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);

    // Filtering: always my own tickets; optionally only one status
    const where = { userId: req.user.id };
    if (ALL_STATUSES.includes(req.query.status)) {
      where.status = req.query.status;
    }

    const tickets = await prisma.queueTicket.findMany({
      where: where,
      orderBy: { createdAt: "desc" }, // sorting: newest first
      skip: (page - 1) * limit,       // pagination: rows to skip
      take: limit,                    // pagination: rows to return
      include: { location: true },
    });
    const total = await prisma.queueTicket.count({ where: where });

    res.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        locationName: t.location.name,
        status: t.status,
        createdAt: t.createdAt,
      })),
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

// =====================  STAFF / ADMIN  =====================

// GET /api/queue/location/:locationId?status=WAITING
// By default shows active tickets (WAITING + CALLED) in ticket order.
async function getLocationQueue(req, res, next) {
  try {
    const locationId = Number(req.params.locationId);
    if (!Number.isInteger(locationId)) {
      return res.status(400).json({ message: "Location id must be a number" });
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Filtering by status (optional)
    const statusFilter = req.query.status;
    const showActiveOnly = !ALL_STATUSES.includes(statusFilter);
    const where = { locationId: locationId };
    where.status = showActiveOnly ? { in: ACTIVE_STATUSES } : statusFilter;

    const tickets = await prisma.queueTicket.findMany({
      where: where,
      // active tickets: oldest first; finished/cancelled: newest first
      orderBy: { ticketNumber: showActiveOnly || statusFilter === "WAITING" ? "asc" : "desc" },
      take: 50,
      include: { user: true },
    });

    const waitingCount = await prisma.queueTicket.count({ where: { locationId: locationId, status: "WAITING" } });
    const currentTicket = await prisma.queueTicket.findFirst({
      where: { locationId: locationId, status: "CALLED" },
      include: { user: true },
    });

    res.json({
      location: { id: location.id, name: location.name, avgServiceMinutes: location.avgServiceMinutes },
      waitingCount: waitingCount,
      currentTicket: currentTicket
        ? { id: currentTicket.id, ticketNumber: currentTicket.ticketNumber, studentName: currentTicket.user.name }
        : null,
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        studentName: t.user.name,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/queue/location/:locationId/call-next
// Calls the WAITING ticket with the smallest ticket number.
async function callNextTicket(req, res, next) {
  try {
    const locationId = Number(req.params.locationId);
    if (!Number.isInteger(locationId)) {
      return res.status(400).json({ message: "Location id must be a number" });
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Rule: finish the current student before calling the next one
    const currentTicket = await prisma.queueTicket.findFirst({
      where: { locationId: locationId, status: "CALLED" },
    });
    if (currentTicket) {
      return res.status(409).json({ message: `Ticket #${currentTicket.ticketNumber} is still being served. Complete it first` });
    }

    const nextTicket = await prisma.queueTicket.findFirst({
      where: { locationId: locationId, status: "WAITING" },
      orderBy: { ticketNumber: "asc" }, // smallest number = joined first (FIFO)
    });
    if (!nextTicket) {
      return res.status(404).json({ message: "No students are waiting in this queue" });
    }

    const calledTicket = await prisma.queueTicket.update({
      where: { id: nextTicket.id },
      data: { status: "CALLED", calledAt: new Date() },
      include: { user: true },
    });

    res.json({
      message: `Ticket #${calledTicket.ticketNumber} (${calledTicket.user.name}) has been called`,
      ticket: { id: calledTicket.id, ticketNumber: calledTicket.ticketNumber, studentName: calledTicket.user.name },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/queue/tickets/:ticketId/complete
async function completeTicket(req, res, next) {
  try {
    const ticketId = Number(req.params.ticketId);
    if (!Number.isInteger(ticketId)) {
      return res.status(400).json({ message: "Ticket id must be a number" });
    }

    const ticket = await prisma.queueTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (ticket.status !== "CALLED") {
      return res.status(409).json({ message: "Only a CALLED ticket can be completed" });
    }

    await prisma.queueTicket.update({
      where: { id: ticketId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    res.json({ message: `Ticket #${ticket.ticketNumber} completed` });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  joinQueue,
  getMyTicket,
  cancelMyTicket,
  getMyHistory,
  getLocationQueue,
  callNextTicket,
  completeTicket,
};
