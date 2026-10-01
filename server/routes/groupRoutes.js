const express = require("express");
const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addGroupMembers,
  removeGroupMember,
} = require("../controllers/groupController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getUserGroups);
router.get("/:groupId", protect, getGroupDetails);
router.post("/:groupId/members", protect, addGroupMembers);
router.delete("/:groupId/members/:memberId", protect, removeGroupMember);

module.exports = router;
