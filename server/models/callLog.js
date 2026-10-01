const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      default: "video",
    },
    status: {
      type: String,
      enum: ["missed", "answered", "rejected"],
      default: "missed",
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.callLog || mongoose.model("callLog", callLogSchema);
