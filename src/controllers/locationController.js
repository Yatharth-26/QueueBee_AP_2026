// CRUD for locations (service points such as Canteen or Library Desk).
const prisma = require("../config/prisma");

// GET /api/locations   - any logged-in user
async function getLocations(req, res, next) {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" }, // sorting
      include: {
        // _count with a filter = number of tickets that are WAITING at this location
        _count: { select: { tickets: { where: { status: "WAITING" } } } },
      },
    });

    const result = locations.map((location) => {
      const waitingCount = location._count.tickets;
      return {
        id: location.id,
        name: location.name,
        description: location.description,
        avgServiceMinutes: location.avgServiceMinutes,
        waitingCount: waitingCount,
        // If you join now you will be position (waitingCount + 1)
        estimatedWaitMinutes: (waitingCount + 1) * location.avgServiceMinutes,
      };
    });

    res.json({ locations: result });
  } catch (error) {
    next(error);
  }
}

// POST /api/locations   - ADMIN only
async function createLocation(req, res, next) {
  try {
    const { name, description } = req.body;
    // Number() turns the text from the form into a number
    const avgServiceMinutes = req.body.avgServiceMinutes ? Number(req.body.avgServiceMinutes) : 5;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Location name is required" });
    }
    if (!Number.isInteger(avgServiceMinutes) || avgServiceMinutes < 1 || avgServiceMinutes > 120) {
      return res.status(400).json({ message: "Average service time must be a whole number from 1 to 120" });
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        avgServiceMinutes: avgServiceMinutes,
      },
    });

    res.status(201).json({ message: "Location created", location });
  } catch (error) {
    next(error); // a duplicate name gives Prisma error P2002 -> 409 in errorHandler
  }
}

// DELETE /api/locations/:id   - ADMIN only
async function deleteLocation(req, res, next) {
  try {
    const locationId = Number(req.params.id);
    if (!Number.isInteger(locationId)) {
      return res.status(400).json({ message: "Location id must be a number" });
    }

    // Tickets of this location are deleted too (onDelete: Cascade in schema.prisma)
    await prisma.location.delete({ where: { id: locationId } });

    res.json({ message: "Location deleted" });
  } catch (error) {
    next(error); // unknown id gives Prisma error P2025 -> 404 in errorHandler
  }
}

module.exports = { getLocations, createLocation, deleteLocation };
