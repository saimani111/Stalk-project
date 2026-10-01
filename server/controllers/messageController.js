const Message = require("../models/message");
const Group = require("../models/group");

// Hide (and let the TTL index destroy) burn messages past their expiry, even
// if the client never called the burn endpoint
const liveBurnFilter = () => ({
  $or: [
    { isBurnAfterReading: false },
    { burnExpiresAt: null },
    { burnExpiresAt: { $gt: new Date() } },
  ],
});

const isGroupMember = async (groupId, userId) => {
  const group = await Group.findById(groupId).select("members");
  return group?.members.some((m) => String(m) === String(userId)) || false;
};

// True when userId sent/received a direct message or is a member of its group
const isMessageParty = async (msg, userId) => {
  if (msg.group) return isGroupMember(msg.group, userId);
  return String(msg.sender) === String(userId) || String(msg.receiver) === String(userId);
};

// Live-notify a conversation: group → room + every member's personal socket
// room (union, delivered once per socket); direct → both parties' rooms
const notifyParties = async (io, msg, event, payload) => {
  if (!io) return;
  if (msg.group) {
    const group = await Group.findById(msg.group).select("members");
    const rooms = [`group_${msg.group}`];
    if (group) for (const m of group.members) rooms.push(`user_${m}`);
    io.to(rooms).emit(event, payload);
  } else {
    io.to(`user_${msg.sender}`).to(`user_${msg.receiver}`).emit(event, payload);
  }
};

// Send Message (1-on-1 or Group)
const sendMessage = async (req, res) => {
  try {
    const {
      receiver,
      group,
      message,
      mediaUrl,
      mediaType,
      fileName,
      replyTo,
      isBurnAfterReading,
      burnDuration,
      pollData,
      eventData,
      contactData,
    } = req.body;

    if (!receiver && !group) {
      return res.status(400).json({ message: "Receiver or Group ID is required" });
    }

    if (group) {
      const groupDoc = await Group.findById(group);
      if (!groupDoc) {
        return res.status(404).json({ message: "Group not found" });
      }
      const isMember = groupDoc.members.some(
        (m) => String(m) === String(req.user._id)
      );
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      receiver: receiver || null,
      group: group || null,
      message: message || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "text",
      fileName: fileName || "",
      replyTo: replyTo || null,
      seen: false,
      isBurnAfterReading: !!isBurnAfterReading,
      burnDuration: burnDuration
        ? Math.min(Math.max(Number(burnDuration) || 10, 1), 3600)
        : 0,
      openedAt: null,
      pollData: pollData || null,
      eventData: eventData || null,
      contactData: contactData || null,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("reactions.user", "name profilePic")
      .populate("pollData.options.votes", "name profilePic")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Direct Messages with a User
const getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    // Latest 200 messages only (newest-first, then flipped back to
    // chronological order) so old threads stay fast
    const messages = (
      await Message.find({
        $and: [
          {
            $or: [
              { sender: req.user._id, receiver: otherUserId },
              { sender: otherUserId, receiver: req.user._id },
            ],
          },
          liveBurnFilter(),
        ],
      })
        .populate("sender", "name profilePic")
        .populate("receiver", "name profilePic")
        .populate("reactions.user", "name profilePic")
        .populate("pollData.options.votes", "name profilePic")
        .populate({
          path: "replyTo",
          populate: { path: "sender", select: "name" },
        })
        .sort({ createdAt: -1 })
        .limit(200)
    ).reverse();

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: req.user._id,
        seen: false,
      },
      { seen: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Group Messages
const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    const isMember = group.members.some((m) => String(m) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = (
      await Message.find({ $and: [{ group: groupId }, liveBurnFilter()] })
        .populate("sender", "name profilePic")
        .populate("reactions.user", "name profilePic")
        .populate("pollData.options.votes", "name profilePic")
        .populate({
          path: "replyTo",
          populate: { path: "sender", select: "name" },
        })
        .sort({ createdAt: -1 })
        .limit(200)
    ).reverse();

    res.json(messages);
  } catch (error) {
    console.error("GET GROUP MESSAGES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete Message (Delete for everyone)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    message.isDeleted = true;
    message.message = "🚫 This message was deleted";
    message.mediaUrl = "";
    message.reactions = [];
    await message.save();

    // Server-authoritative live notification to the other party / group room
    await notifyParties(req.app.get("io"), message, "message_deleted", {
      messageId: String(message._id),
    });

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    res.json(updatedMessage);
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// React to a Message
const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user already reacted with emoji
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Toggle off if same emoji
        message.reactions.splice(existingIndex, 1);
      } else {
        // Change emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Add reaction
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("reactions.user", "name profilePic")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    res.json(updatedMessage);
  } catch (error) {
    console.error("REACT TO MESSAGE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Summary of all conversations (last message & unread count)
const getConversationsSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Group messages are scoped to groups the user is actually a member of
    const myGroups = await Group.find({ members: userId }).select("_id");

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: userId },
            { receiver: userId },
            { group: { $in: myGroups.map((g) => g._id) } },
          ],
        },
        liveBurnFilter(),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(300)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic");

    const summary = {};

    for (const msg of messages) {
      let convKey = null;
      if (msg.group) {
        convKey = String(msg.group);
      } else if (msg.sender && msg.receiver) {
        const senderId = String(msg.sender._id || msg.sender);
        const receiverId = String(msg.receiver._id || msg.receiver);
        convKey = senderId === String(userId) ? receiverId : senderId;
      }

      if (!convKey) continue;

      if (!summary[convKey]) {
        let snippet = msg.message;
        if (msg.isDeleted) snippet = "🚫 This message was deleted";
        else if (msg.mediaType === "audio") snippet = "🎙️ Voice note";
        else if (msg.mediaType === "image") snippet = "📷 Photo";
        else if (msg.mediaType === "poll") snippet = "📊 Poll: " + (msg.pollData?.question || "Poll");
        else if (msg.mediaType === "event") snippet = "📅 Event: " + (msg.eventData?.title || "Calendar Event");
        else if (msg.mediaType === "contact") snippet = "👤 Contact: " + (msg.contactData?.name || "Shared Contact");
        else if (msg.mediaType === "document" || msg.mediaType === "file") snippet = "📄 " + (msg.fileName || "Document");

        summary[convKey] = {
          lastMessage: snippet || "Transmission",
          timestamp: msg.createdAt,
          unreadCount: 0,
        };
      }

      // Check if message is unread for this user
      if (!msg.seen && msg.receiver) {
        const receiverId = String(msg.receiver._id || msg.receiver);
        if (receiverId === String(userId)) {
          summary[convKey].unreadCount += 1;
        }
      }
    }

    res.json(summary);
  } catch (error) {
    console.error("SUMMARY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Open/trigger countdown for a burn-after-reading message
const openBurnMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (!(await isMessageParty(msg, req.user._id))) {
      return res.status(403).json({ message: "Not authorized to open this message" });
    }

    if (!msg.openedAt) {
      msg.openedAt = new Date();
      if (msg.isBurnAfterReading) {
        const seconds = Math.min(Math.max(Number(msg.burnDuration) || 10, 1), 3600);
        msg.burnExpiresAt = new Date(msg.openedAt.getTime() + seconds * 1000);
      }
      await msg.save();
    }

    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Permanently burn/delete a message once timer expires
const burnMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await Message.findById(id);
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    const userId = String(req.user._id);
    const isDirectParty =
      !msg.group &&
      (String(msg.sender) === userId || String(msg.receiver) === userId);
    let isGroupMember = false;
    if (msg.group) {
      const group = await Group.findById(msg.group);
      isGroupMember = group?.members.some((m) => String(m) === userId) || false;
    }

    if (!isDirectParty && !isGroupMember) {
      return res.status(403).json({ message: "Not authorized to burn this message" });
    }

    await Message.findByIdAndDelete(id);

    // The document is gone by now, so the socket relay can't announce it —
    // this is the authoritative path for "message destroyed"
    await notifyParties(req.app.get("io"), msg, "message_burned", { messageId: String(id) });

    res.json({ message: "Message burned", messageId: id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Vote on a poll option
const votePoll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg || msg.mediaType !== "poll" || !msg.pollData) {
      return res.status(404).json({ message: "Poll not found" });
    }

    const optIdx = Number(optionIndex);
    if (isNaN(optIdx) || optIdx < 0 || optIdx >= msg.pollData.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    // Toggle or clear previous vote from all options in this poll
    msg.pollData.options.forEach((opt) => {
      opt.votes = (opt.votes || []).filter((v) => String(v) !== String(userId));
    });

    // Cast vote to chosen option
    msg.pollData.options[optIdx].votes.push(userId);

    await msg.save();

    const populated = await Message.findById(msg._id)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("reactions.user", "name profilePic")
      .populate("pollData.options.votes", "name profilePic")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    res.json(populated);
  } catch (error) {
    console.error("VOTE POLL ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getGroupMessages,
  deleteMessage,
  reactToMessage,
  getConversationsSummary,
  openBurnMessage,
  burnMessage,
  votePoll,
};