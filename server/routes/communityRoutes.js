const express = require("express");
const router = express.Router();
const {
  getCommunities,
  createCommunity,
  postAnnouncement,
  linkGroupToCommunity,
} = require("../controllers/communityController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getCommunities);
router.post("/", protect, createCommunity);
router.post("/:communityId/announcement", protect, postAnnouncement);
router.post("/:communityId/groups", protect, linkGroupToCommunity);

module.exports = router;
