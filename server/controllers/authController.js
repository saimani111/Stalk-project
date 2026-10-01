const User = require("../models/user");
const OTP = require("../models/otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendMail } = require("../config/mailer");

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password, profilePic } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profilePic: profilePic || "",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      token,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Server error during login",
    });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  res.json(req.user);
};

// Forgot Password — email a 6-digit OTP (single use, 10 min, max 5 tries)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const baseResponse = {
      message: "If that email is registered, a 6-digit code is on its way. It expires in 10 minutes.",
    };

    if (!email || typeof email !== "string") return res.json(baseResponse);
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json(baseResponse);

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 8);
    await OTP.deleteMany({ email: user.email, purpose: "password-reset" });
    await OTP.create({ email: user.email, codeHash, purpose: "password-reset" });

    const sent = await sendMail({
      to: user.email,
      subject: "Your Stalk password reset code",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#f8fafc;border-radius:16px">
          <h2 style="color:#ef4444;margin:0 0 8px">Stalk</h2>
          <p>Hi ${user.name}, use this code to reset your password:</p>
          <p style="font-size:36px;letter-spacing:8px;font-weight:800;color:#fbbf24;margin:16px 0">${code}</p>
          <p style="color:#a1a1aa">It expires in 10 minutes and works once. If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });

    // Dev convenience only: when mail is unconfigured outside production, expose
    // the code so local E2E tests can complete the flow. Never in production.
    if (!sent && process.env.NODE_ENV !== "production") {
      console.log(`[dev] OTP for ${user.email}: ${code}`);
      return res.json({ ...baseResponse, devCode: code });
    }
    return res.json(baseResponse);
  } catch (error) {
    console.error("FORGOT-PASSWORD ERROR:", error);
    // keep the same generic shape on failure (no enumeration)
    return res.json({
      message: "If that email is registered, a 6-digit code is on its way. It expires in 10 minutes.",
    });
  }
};

// Reset Password with emailed OTP
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otp = await OTP.findOne({ email: normalizedEmail, purpose: "password-reset" });
    if (!otp) {
      return res.status(400).json({ message: "Code expired or not found. Request a new one." });
    }
    if (otp.attempts >= 5) {
      await OTP.deleteMany({ email: normalizedEmail, purpose: "password-reset" });
      return res.status(400).json({ message: "Too many attempts. Request a new code." });
    }

    otp.attempts += 1;
    await otp.save();

    const match = await bcrypt.compare(String(code).trim(), otp.codeHash);
    if (!match) {
      return res.status(400).json({ message: "Invalid code" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Code expired or not found. Request a new one." });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    await OTP.deleteMany({ email: normalizedEmail, purpose: "password-reset" });

    res.json({ message: "Password updated — log in with your new password." });
  } catch (error) {
    console.error("RESET-PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword,
};