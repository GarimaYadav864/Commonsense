
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Support multi-role accounts and legacy records whose role fields
    // may not yet be fully synchronized.
    const userRoles = [
      ...(Array.isArray(req.user.roles) ? req.user.roles : []),
      req.user.role,
      req.user.activeRole,
    ].filter((role, index, roles) => role && roles.indexOf(role) === index);

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
