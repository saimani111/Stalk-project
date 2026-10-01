const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    announcements: [
      {
        message: { type: String, required: true },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.community || mongoose.model("community", communitySchema);
