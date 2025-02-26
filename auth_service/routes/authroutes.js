const express = require("express");
const { register, login, verifyToken } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// User Registration Route
router.post("/register", register);

// User Login Route
router.post("/login", login);

// Token Verification Route (Protected)
router.get("/verify", authMiddleware, verifyToken);

module.exports = router;
