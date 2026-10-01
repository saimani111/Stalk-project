const Status = require("../models/status");

// Get active statuses (past 24 hours) grouped by user
const getStatuses = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const statuses = await Status.find({
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate("user", "name email profilePic")
      .populate("viewers", "name email profilePic")
      .sort({ createdAt: -1 });

    // Group statuses by user
    const userStatusMap = {};
    statuses.forEach((status) => {
      const uId = String(status.user?._id || status.user);
      if (!userStatusMap[uId]) {
        userStatusMap[uId] = {
          user: status.user,
          statuses: [],
          hasUnviewed: false,
          lastUpdated: status.createdAt,
        };
      }
      userStatusMap[uId].statuses.push(status);

      // Check if current user has not viewed this story
      const hasViewed = status.viewers?.some(
        (v) => String(v._id || v) === String(req.user._id)
      );
      if (!hasViewed && String(status.user?._id) !== String(req.user._id)) {
        userStatusMap[uId].hasUnviewed = true;
      }
    });

    res.json(Object.values(userStatusMap));
  } catch (error) {
    console.error("getStatuses error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new status
const createStatus = async (req, res) => {
  try {
    const { mediaUrl, caption, backgroundColor } = req.body;

    const newStatus = await Status.create({
      user: req.user._id,
      mediaUrl: mediaUrl || "",
      caption: caption || "",
      backgroundColor: backgroundColor || "#dc2626",
      viewers: [],
    });

    const populatedStatus = await Status.findById(newStatus._id)
      .populate("user", "name email profilePic")
      .populate("viewers", "name email profilePic");

    res.status(201).json(populatedStatus);
  } catch (error) {
    console.error("createStatus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark status as viewed
const viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user._id;

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (!status.viewers.some((v) => String(v) === String(userId))) {
      status.viewers.push(userId);
      await status.save();
    }

    const updated = await Status.findById(statusId)
      .populate("user", "name email profilePic")
      .populate("viewers", "name email profilePic");

    res.json(updated);
  } catch (error) {
    console.error("viewStatus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete status
const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (String(status.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to delete this status" });
    }

    await Status.findByIdAndDelete(statusId);
    res.json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("deleteStatus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStatuses,
  createStatus,
  viewStatus,
  deleteStatus,
};
