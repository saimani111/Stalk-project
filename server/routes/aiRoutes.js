const express = require("express");
const router = express.Router();
const { askAssistant, speak, aiStatus } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

router.get("/status", protect, aiStatus);
router.post("/chat", protect, askAssistant);
router.post("/speak", protect, speak);

module.exports = router;
