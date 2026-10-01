const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
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
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Group || mongoose.model("Group", groupSchema);
