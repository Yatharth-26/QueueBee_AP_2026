// Centralized Error Handling Middleware
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const env = require('../config/env');
const { sendError } = require('../utils/response.util');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Prisma Known Request Errors
  if (err.code === 'P2002') {
    const fields = err.meta?.target || 'field';
    return sendError(res, `A record with this ${fields} already exists.`, 409);
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Record not found in the database.', 404);
  }

  // JSON parsing error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON in request body.', 400);
  }

  const message = env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  return sendError(res, message, err.statusCode || 500);
};

// 404 Not Found Handler for API endpoints
const notFoundHandler = (req, res) => {
  return sendError(res, `API route '${req.method} ${req.originalUrl}' not found`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
