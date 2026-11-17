// Zod Validation Middleware
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const { sendError } = require('../utils/response.util');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.safeParse(dataToValidate);

      if (!parsed.success) {
        const formattedErrors = parsed.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return sendError(res, 'Validation failed', 400, formattedErrors);
      }

      // Replace with sanitized/parsed data
      req[source] = parsed.data;
      next();
    } catch (error) {
      return sendError(res, 'Invalid request structure', 400);
    }
  };
};

module.exports = {
  validate,
};
