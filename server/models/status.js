const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    caption: {
      type: String,
      default: "",
    },
    backgroundColor: {
      type: String,
      default: "#dc2626", // default crimson red for text status
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // MongoDB TTL: automatically deletes document 24 hours after creation!
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.status || mongoose.model("status", statusSchema);
