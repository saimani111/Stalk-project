const express = require("express");
const router = express.Router();
const { askAssistant, speak } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

router.post("/chat", protect, askAssistant);
router.post("/speak", protect, speak);

module.exports = router;
