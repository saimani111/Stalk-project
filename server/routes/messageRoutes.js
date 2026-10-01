const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  getGroupMessages,
  deleteMessage,
  reactToMessage,
  getConversationsSummary,
  openBurnMessage,
  burnMessage,
  votePoll,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

// SEND MESSAGE
router.post("/", protect, sendMessage);

// GET CONVERSATIONS SUMMARY (Last messages and unread counts)
router.get("/conversations/summary", protect, getConversationsSummary);

// OPEN BURN-AFTER-READING MESSAGE (Trigger timer)
router.put("/:id/open-burn", protect, openBurnMessage);

// BURN / DELETE EXPIRED MESSAGE
router.delete("/:id/burn", protect, burnMessage);

// GET DIRECT MESSAGES
router.get("/user/:userId", protect, getMessages);
router.get("/:userId", protect, getMessages);

// GET GROUP MESSAGES
router.get("/group/:groupId", protect, getGroupMessages);

// DELETE MESSAGE (Delete for everyone)
router.delete("/:messageId", protect, deleteMessage);

// MESSAGE REACTION
router.post("/:messageId/react", protect, reactToMessage);

// VOTE ON POLL
router.post("/:messageId/vote", protect, votePoll);

module.exports = router;