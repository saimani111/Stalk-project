const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// OTP endpoints get a much tighter budget than general auth traffic
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Try again in 15 minutes." },
});

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/forgot-password", otpLimiter, forgotPassword);

router.post("/reset-password", otpLimiter, resetPassword);

router.get("/profile", protect, getProfile);

module.exports = router;
