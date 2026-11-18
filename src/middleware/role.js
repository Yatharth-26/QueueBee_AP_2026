// requireRole("ADMIN") or requireRole("STAFF", "ADMIN") - role-based access control (RBAC).
// It is a function that RETURNS a middleware function, so we can pass the allowed roles.
// Always use it AFTER requireAuth, because it needs req.user.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      // 403 Forbidden = we know who you are, but you are not allowed to do this
      return res.status(403).json({
        message: `Access denied. Allowed role(s): ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
}

module.exports = { requireRole };
