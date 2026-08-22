const express = require("express");

const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/access-test",
  authenticate,
  authorizeRoles("hr"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "HR access granted",
      user: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;