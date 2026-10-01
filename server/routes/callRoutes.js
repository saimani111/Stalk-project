const express = require("express");
const router = express.Router();
const {
  getCallLogs,
  createCallLog,
  clearCallLogs,
} = require("../controllers/callController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getCallLogs);
router.post("/", protect, createCallLog);
router.delete("/", protect, clearCallLogs);

module.exports = router;
