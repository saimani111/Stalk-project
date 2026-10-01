const CallLog = require("../models/callLog");

// Get call history for the current logged-in user
const getCallLogs = async (req, res) => {
  try {
    const userId = req.user._id;

    const callLogs = await CallLog.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate("caller", "name email profilePic")
      .populate("receiver", "name email profilePic")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(callLogs);
  } catch (error) {
    console.error("getCallLogs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Record a new call log entry
const createCallLog = async (req, res) => {
  try {
    const { receiver, callType, status, duration } = req.body;

    const newLog = await CallLog.create({
      caller: req.user._id,
      receiver,
      callType: callType || "video",
      status: status || "missed",
      duration: duration || 0,
    });

    const populatedLog = await CallLog.findById(newLog._id)
      .populate("caller", "name email profilePic")
      .populate("receiver", "name email profilePic");

    res.status(201).json(populatedLog);
  } catch (error) {
    console.error("createCallLog error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Clear call logs for the logged-in user
const clearCallLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    await CallLog.deleteMany({
      $or: [{ caller: userId }, { receiver: userId }],
    });
    res.json({ message: "Call logs cleared successfully" });
  } catch (error) {
    console.error("clearCallLogs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCallLogs,
  createCallLog,
  clearCallLogs,
};
