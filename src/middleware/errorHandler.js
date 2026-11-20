// Central place for errors. Express knows it is an error handler
// because it has FOUR parameters (err, req, res, next).

// Runs when no route matched the URL
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Runs when a controller calls next(error) or something throws
function errorHandler(err, req, res, next) {
  console.error(err);

  // Bad JSON sent by the client
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }

  // Prisma error codes
  if (err.code === "P2002") {
    // unique constraint failed (e.g. duplicate email or location name)
    return res.status(409).json({ message: "This record already exists. Please try again" });
  }
  if (err.code === "P2025") {
    // record to update/delete was not found
    return res.status(404).json({ message: "Record not found" });
  }
  if (err.code === "P2003") {
    // foreign key constraint failed
    return res.status(400).json({ message: "Referenced record does not exist" });
  }

  // Anything else is our fault, so 500 Internal Server Error
  res.status(500).json({ message: "Something went wrong on the server" });
}

module.exports = { notFound, errorHandler };
