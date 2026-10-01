const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: false,
    },

    message: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    mediaUrl: {
      type: String,
      default: "",
    },

    mediaType: {
      type: String,
      enum: ["text", "image", "audio", "file", "document", "poll", "event", "contact"],
      default: "text",
    },

    fileName: {
      type: String,
      default: "",
    },

    // Interactive Poll Data
    pollData: {
      question: String,
      options: [
        {
          text: String,
          votes: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "user",
            },
          ],
        },
      ],
    },

    // Calendar / Event Data
    eventData: {
      title: String,
      date: String,
      time: String,
      location: String,
      description: String,
    },

    // Contact Card Data
    contactData: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
      name: String,
      email: String,
      profilePic: String,
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        emoji: String,
      },
    ],

    seen: {
      type: Boolean,
      default: false,
    },

    isBurnAfterReading: {
      type: Boolean,
      default: false,
    },

    burnDuration: {
      type: Number,
      default: 0,
    },

    openedAt: {
      type: Date,
      default: null,
    },

    // Set server-side when a burn message is first opened; TTL index then
    // hard-deletes the document once the timestamp passes
    burnExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for the hot queries: direct-thread history and group feeds
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: 1 });
messageSchema.index({ group: 1, createdAt: 1 });

// Self-destruct: MongoDB removes the document at burnExpiresAt
messageSchema.index({ burnExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);