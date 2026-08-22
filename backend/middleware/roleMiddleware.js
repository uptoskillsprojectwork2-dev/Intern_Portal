const VALID_ROLES = ["intern", "hr", "admin"];

const authorizeRoles = (...allowedRoles) => {
  const invalidRoles = allowedRoles.filter(
    (role) => !VALID_ROLES.includes(role)
  );

  if (invalidRoles.length > 0) {
    throw new Error(
      `Invalid role configuration: ${invalidRoles.join(", ")}`
    );
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        message: "User role is missing",
      });
    }

    if (!VALID_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};