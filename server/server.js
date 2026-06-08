const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

const connectDB = require("./config/db");

dotenv.config();

// Connect MongoDB
connectDB();

const app = express();

// Create HTTP Server
const server = http.createServer(app);

// Store Online Users
const onlineUsers = new Map();

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Socket Events
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // User comes online
  socket.on("user_online", (userId) => {
    onlineUsers.set(userId, socket.id);

    io.emit("online_users", [...onlineUsers.keys()]);

    console.log("Online Users:", [...onlineUsers.keys()]);
  });

  // Send Message
  socket.on("send_message", (data) => {
    console.log("Message Received:", data);

    io.emit("receive_message", data);
  });

  // Typing Indicator
  socket.on("typing", () => {
    socket.broadcast.emit("user_typing");
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stop_typing");
  });

  // Read Receipt
  socket.on("message_seen", () => {
    io.emit("message_seen");
  });

  // User disconnects
  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("online_users", [...onlineUsers.keys()]);

    console.log("User Disconnected:", socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Stalk Backend Running 🚀");
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});