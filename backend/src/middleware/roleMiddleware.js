
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // New accounts can hold multiple roles. Fall back to the legacy single
    // role so existing database records remain authorized during migration.
    const userRoles = Array.isArray(req.user.roles) && req.user.roles.length
      ? req.user.roles
      : [req.user.role].filter(Boolean);

    const hasRequiredRole = allowedRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
