// requireAuth: checks that the request carries a valid JWT.
// The frontend sends:   Authorization: Bearer <token>
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please log in first" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // jwt.verify checks the signature and the expiry time
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Save the logged-in user's info so later middleware/controllers can use it
    req.user = { id: payload.id, name: payload.name, role: payload.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token. Please log in again" });
  }
}

module.exports = { requireAuth };
