const express = require("express");
const router = express.Router();

const {
  getUsers,
  updateProfilePic,
  deleteProfilePic,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getUsers);
router.put("/profile-pic", protect, updateProfilePic);
router.delete("/profile-pic", protect, deleteProfilePic);

module.exports = router;