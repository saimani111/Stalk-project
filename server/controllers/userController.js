const User = require("../models/user");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updateProfilePic = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profilePic = profilePic || "";
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    console.error("updateProfilePic error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteProfilePic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profilePic = "";
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: "",
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    console.error("deleteProfilePic error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getUsers, updateProfilePic, deleteProfilePic };