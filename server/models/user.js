const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    profilePic: {
      type: String,
      default: "",
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // What Stuny (AI companion) remembers about this user
    stunyMemory: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.user || mongoose.model("user", userSchema);