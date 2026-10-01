const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const callRoutes = require("./routes/callRoutes");
const statusRoutes = require("./routes/statusRoutes");
const communityRoutes = require("./routes/communityRoutes");
const aiRoutes = require("./routes/aiRoutes");

const User = require("./models/user");
const Group = require("./models/group");
const Message = require("./models/message");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not defined in environment");
  process.exit(1);
}

// Connect MongoDB
connectDB();

const app = express();

// Render/proxy awareness: without this, rate limiters key every user on the
// same proxy IP and lock the whole app out
app.set("trust proxy", 1);

// Create HTTP Server
const server = http.createServer(app);

// Store Online Users (userId -> socketId)
const onlineUsers = new Map();

// Helper to extract string ID from ObjectId or object
const extractId = (val) => {
  if (!val) return null;
  if (typeof val === "object" && val._id) return String(val._id);
  return String(val);
};

// CORS Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "https://stalk-project.vercel.app",
];

app.use(
  helmet({
    // Uploads are embedded by the deployed frontend on a different origin
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https:"],
      },
    },
  })
);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads, please try again later" },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Stuny needs a little breather — too many messages. Try again soon." },
});

// Serve Static Uploads Folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Authenticate socket connections via JWT handshake
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = String(decoded.id);
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// --- Server-authoritative socket helpers -------------------------------
// Clients only ever relay message IDs; payloads are re-read from the DB so
// nobody can forge or eavesdrop on another conversation over the socket.

const findPopulatedMessage = (id) =>
  Message.findById(id)
    .populate("sender", "name profilePic")
    .populate("receiver", "name profilePic")
    .populate("reactions.user", "name profilePic")
    .populate("pollData.options.votes", "name profilePic")
    .populate({ path: "replyTo", populate: { path: "sender", select: "name" } })
    .lean();

const emitToParties = async (event, payload, msg) => {
  const groupId = extractId(msg.group);
  if (groupId) {
    // Union of the room + every member's personal room, so members who
    // joined late (or never) still get live group events. Sockets in
    // multiple rooms receive the event only once.
    const group = await Group.findById(groupId).select("members");
    const rooms = [`group_${groupId}`];
    if (group) for (const m of group.members) rooms.push(`user_${m}`);
    io.to(rooms).emit(event, payload);
    return;
  }
  io.to(`user_${extractId(msg.sender)}`)
    .to(`user_${extractId(msg.receiver)}`)
    .emit(event, payload);
};

// Returns the message only when userId may access it (direct party or group member)
const messageAccess = async (messageId, userId) => {
  const msg = await Message.findById(messageId).select("sender receiver group burnDuration");
  if (!msg) return null;
  if (msg.group) {
    const group = await Group.findById(msg.group).select("members");
    if (!group || !group.members.some((m) => String(m) === userId)) return null;
    return msg;
  }
  if (String(msg.sender) !== userId && String(msg.receiver) !== userId) return null;
  return msg;
};

// Socket event handlers in controllers (burn/delete notifications) reach io here
app.set("io", io);

// Socket Events
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id, "user:", socket.userId);

  // Personal room for server-originated events + auto-join real group rooms
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
    Group.find({ members: socket.userId })
      .select("_id")
      .then((groups) => {
        for (const g of groups) socket.join(`group_${g._id}`);
      })
      .catch(console.error);
  }

  // User comes online (identity comes from the JWT, not the client payload)
  socket.on("user_online", () => {
    const sId = socket.userId;
    if (sId) {
      onlineUsers.set(sId, socket.id);
      io.emit("online_users", [...onlineUsers.keys()]);
    }
  });

  // Group Rooms — membership verified against the database
  socket.on("join_group", async (groupId) => {
    const gId = extractId(groupId);
    if (!gId || !socket.userId) return;
    try {
      const group = await Group.findById(gId).select("members");
      if (!group || !group.members.some((m) => String(m) === socket.userId)) return;
      socket.join(`group_${gId}`);
    } catch (err) {
      console.error("join_group error:", err);
    }
  });

  socket.on("leave_group", (groupId) => {
    const gId = extractId(groupId);
    if (gId) {
      socket.leave(`group_${gId}`);
      console.log(`Socket ${socket.id} left group_${gId}`);
    }
  });

  // 1-on-1 & Group Messaging — payload re-read from DB, sender must be the JWT user
  socket.on("send_message", async (data) => {
    const msgId = extractId(data?._id);
    if (!msgId || !socket.userId) return;
    try {
      const msg = await findPopulatedMessage(msgId);
      if (!msg || extractId(msg.sender) !== socket.userId) return;
      await emitToParties("receive_message", msg, msg);
    } catch (err) {
      console.error("send_message relay error:", err);
    }
  });

  // Message Reactions
  socket.on("message_reaction", async (data) => {
    const msgId = extractId(data?._id || data?.messageId);
    if (!msgId || !socket.userId) return;
    try {
      const allowed = await messageAccess(msgId, socket.userId);
      if (!allowed) return;
      const fresh = await findPopulatedMessage(msgId);
      if (fresh) await emitToParties("receive_reaction", fresh, fresh);
    } catch (err) {
      console.error("message_reaction relay error:", err);
    }
  });

  // Poll Votes
  socket.on("poll_vote", async (data) => {
    const msgId = extractId(data?._id || data?.messageId);
    if (!msgId || !socket.userId) return;
    try {
      const allowed = await messageAccess(msgId, socket.userId);
      if (!allowed) return;
      const fresh = await findPopulatedMessage(msgId);
      if (fresh) await emitToParties("receive_poll_vote", fresh, fresh);
    } catch (err) {
      console.error("poll_vote relay error:", err);
    }
  });

  // Group Membership Updates — verified against the DB group, new members
  // are (re)joined to the room so users added while online pick it up.
  socket.on("group_updated", async (data) => {
    const group = data?.group;
    const groupId = extractId(group?._id || data?.groupId);
    if (!groupId || !socket.userId) return;
    try {
      const dbGroup = await Group.findById(groupId).select("members");
      if (dbGroup) {
        if (!dbGroup.members.some((m) => String(m) === socket.userId)) return;
        for (const m of dbGroup.members) {
          const memberSocket = onlineUsers.get(String(m));
          if (memberSocket) memberSocket.join(`group_${groupId}`);
        }
      }
      // dbGroup null → deletion; only sockets already in the room hear about it
      socket.to(`group_${groupId}`).emit("group_updated", data.group || data);
    } catch (err) {
      console.error("group_updated relay error:", err);
    }
  });

  // Burn After Reading Countdown Started — duration comes from the DB message
  socket.on("burn_started", async (data) => {
    const msgId = extractId(data?.messageId);
    if (!msgId || !socket.userId) return;
    try {
      const msg = await messageAccess(msgId, socket.userId);
      if (!msg) return;
      await emitToParties("burn_started", { messageId: String(msgId), duration: msg.burnDuration || 10 }, msg);
    } catch (err) {
      console.error("burn_started relay error:", err);
    }
  });

  // Message Burned & Destroyed (hard-deleted messages are announced by the
  // REST burn endpoint; this relay covers the still-present case)
  socket.on("message_burned", async (data) => {
    const msgId = extractId(data?.messageId);
    if (!msgId || !socket.userId) return;
    try {
      const msg = await messageAccess(msgId, socket.userId);
      if (!msg) return;
      await emitToParties("message_burned", { messageId: String(msgId) }, msg);
    } catch (err) {
      console.error("message_burned relay error:", err);
    }
  });

  // Typing Indicators (sender identity comes from the JWT)
  socket.on("typing", (data) => {
    const receiverId = extractId(data?.receiver);
    const groupId = extractId(data?.group);
    const senderId = socket.userId;

    if (receiverId) {
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("user_typing", { sender: senderId, receiver: receiverId });
      }
    } else if (groupId) {
      socket.to(`group_${groupId}`).emit("user_typing", { sender: senderId, group: groupId });
    }
  });

  socket.on("stop_typing", (data) => {
    const receiverId = extractId(data?.receiver);
    const groupId = extractId(data?.group);
    const senderId = socket.userId;

    if (receiverId) {
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("user_stop_typing", { sender: senderId, receiver: receiverId });
      }
    } else if (groupId) {
      socket.to(`group_${groupId}`).emit("user_stop_typing", { sender: senderId, group: groupId });
    }
  });

  socket.on("message_seen", (data) => {
    const senderId = extractId(data?.sender);
    if (senderId) {
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_seen", data);
      }
    }
  });

  // ================= WebRTC Voice & Video Calling =================
  socket.on("call-user", ({ userToCall, offer, name, callType }) => {
    const targetId = extractId(userToCall);
    const recipientSocketId = onlineUsers.get(targetId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("incoming-call", {
        from: socket.userId,
        name,
        offer,
        callType: callType || "video",
      });
    }
  });

  socket.on("make-answer", ({ to, answer }) => {
    const targetId = extractId(to);
    const recipientSocketId = onlineUsers.get(targetId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("call-answered", {
        from: socket.id,
        answer,
      });
    }
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const targetId = extractId(to);
    const recipientSocketId = onlineUsers.get(targetId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("ice-candidate", {
        candidate,
      });
    }
  });

  socket.on("reject-call", ({ to }) => {
    const targetId = extractId(to);
    const recipientSocketId = onlineUsers.get(targetId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("call-rejected");
    }
  });

  socket.on("end-call", ({ to }) => {
    const targetId = extractId(to);
    const recipientSocketId = onlineUsers.get(targetId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("call-ended");
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      const lastSeenDate = new Date();
      User.findByIdAndUpdate(disconnectedUserId, { lastSeen: lastSeenDate })
        .exec()
        .catch(console.error);
      io.emit("user_last_seen", { userId: disconnectedUserId, lastSeen: lastSeenDate });
    }

    io.emit("online_users", [...onlineUsers.keys()]);
    console.log("User Disconnected:", socket.id, disconnectedUserId || "");
  });

  // Delete message event — only the original sender may announce a delete
  socket.on("delete_message", async (data) => {
    const msgId = extractId(data?.messageId);
    if (!msgId || !socket.userId) return;
    try {
      const msg = await Message.findById(msgId).select("sender receiver group");
      if (!msg || extractId(msg.sender) !== socket.userId) return;
      await emitToParties("message_deleted", { messageId: String(msgId) }, msg);
    } catch (err) {
      console.error("delete_message relay error:", err);
    }
  });

  // Avatar update event
  socket.on("update_avatar", (data) => {
    io.emit("avatar_updated", data);
  });

  // Status, Call, and Community real-time events
  socket.on("new_status", (data) => {
    io.emit("status_posted", data);
  });

  socket.on("call_recorded", (data) => {
    io.emit("call_logged", data);
  });

  socket.on("new_community", (data) => {
    io.emit("community_created", data);
  });
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Stalk Backend Running 🚀");
});

// 404 & Central Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});