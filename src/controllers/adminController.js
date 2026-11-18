// Admin features: statistics, user list and changing user roles.
const prisma = require("../config/prisma");

const ALL_ROLES = ["STUDENT", "STAFF", "ADMIN"];

// GET /api/admin/stats
async function getStats(req, res, next) {
  try {
    // --- user statistics ---
    const totalUsers = await prisma.user.count();
    const students = await prisma.user.count({ where: { role: "STUDENT" } });
    const staff = await prisma.user.count({ where: { role: "STAFF" } });
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });

    // --- ticket statistics ---
    // groupBy works like SQL "GROUP BY": one row for every (location, status) pair
    const groups = await prisma.queueTicket.groupBy({
      by: ["locationId", "status"],
      _count: { _all: true },
    });

    const tickets = { total: 0, WAITING: 0, CALLED: 0, COMPLETED: 0, CANCELLED: 0 };
    const perLocation = {}; // locationId -> { WAITING: 2, COMPLETED: 5, ... }

    groups.forEach((group) => {
      const count = group._count._all;
      tickets.total += count;
      tickets[group.status] += count;

      if (!perLocation[group.locationId]) {
        perLocation[group.locationId] = { WAITING: 0, CALLED: 0, COMPLETED: 0, CANCELLED: 0 };
      }
      perLocation[group.locationId][group.status] = count;
    });

    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    const locationStats = locations.map((location) => {
      const counts = perLocation[location.id] || { WAITING: 0, CALLED: 0, COMPLETED: 0, CANCELLED: 0 };
      return {
        id: location.id,
        name: location.name,
        avgServiceMinutes: location.avgServiceMinutes,
        waiting: counts.WAITING,
        called: counts.CALLED,
        completed: counts.COMPLETED,
        cancelled: counts.CANCELLED,
      };
    });

    res.json({
      users: { total: totalUsers, students: students, staff: staff, admins: admins },
      tickets: tickets,
      locations: locationStats,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/users?page=1&limit=10&role=STUDENT
async function getUsers(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    // Filtering by role (optional)
    const where = {};
    if (ALL_ROLES.includes(req.query.role)) {
      where.role = req.query.role;
    }

    const users = await prisma.user.findMany({
      where: where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      // select = choose which columns to return (so passwordHash is never sent)
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    const total = await prisma.user.count({ where: where });

    res.json({ users: users, page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/users/:id/role      body: { role }
// This is how a student account becomes STAFF (registration only creates students).
async function changeUserRole(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const newRole = req.body.role;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "User id must be a number" });
    }
    if (!ALL_ROLES.includes(newRole)) {
      return res.status(400).json({ message: "Role must be STUDENT, STAFF or ADMIN" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ message: `${user.name} is now ${user.role}`, user });
  } catch (error) {
    next(error); // unknown user id -> Prisma P2025 -> 404
  }
}

module.exports = { getStats, getUsers, changeUserRole };
