const express = require("express");

const {
  signup,
  login,
  refresh,
  logout,
} = require("../controllers/authController");

const {
  signupValidation,
  loginValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

const router = express.Router();

// POST /api/auth/signup
router.post(
  "/signup",
  signupValidation,
  handleValidationErrors,
  signup
);

// POST /api/auth/login
router.post(
  "/login",
  loginValidation,
  handleValidationErrors,
  login
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  refresh
);

// POST /api/auth/logout
router.post(
  "/logout",
  logout
);

module.exports = router;