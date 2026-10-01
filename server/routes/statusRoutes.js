const express = require("express");
const router = express.Router();
const {
  getStatuses,
  createStatus,
  viewStatus,
  deleteStatus,
} = require("../controllers/statusController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getStatuses);
router.post("/", protect, createStatus);
router.put("/:statusId/view", protect, viewStatus);
router.delete("/:statusId", protect, deleteStatus);

module.exports = router;
