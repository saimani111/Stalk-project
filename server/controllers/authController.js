const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

module.exports = {
  registerUser,
  loginUser,
  getProfile,
};