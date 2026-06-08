console.log("MESSAGE ROUTES FILE LOADED");

const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

// TEST ROUTE
router.get("/test", (req, res) => {
  res.send("Message Route Working");
});

// SEND MESSAGE
router.post("/", protect, sendMessage);

// GET CHAT MESSAGES
router.get("/:userId", protect, getMessages);

module.exports = router;