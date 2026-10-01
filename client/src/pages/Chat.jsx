import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  getAllUsers,
  getUserGroupsApi,
  getDirectMessages,
  getGroupMessages,
  getConversationsSummaryApi,
  sendApiMessage,
  reactToApiMessage,
  votePollApi,
  uploadFileApi,
  deleteApiMessage,
  createCallLogApi,
  openBurnMessageApi,
  burnMessageApi,
  BASE_URL,
} from "../services/api";

import {
  MessageSquare,
  Search,
  Plus,
  Phone,
  Video,
  Paperclip,
  Mic,
  Send,
  LogOut,
  Users as UsersIcon,
  User as UserIcon,
  FileText,
  Check,
  CheckCheck,
  Reply,
  Trash2,
  X,
  Camera,
  CircleDot,
  Globe,
  PhoneCall,
  Ghost,
  Flame,
  BarChart3,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  getChatBackground,
  buildChatBgStyle,
  DEFAULT_CHAT_BG,
} from "../utils/chatBackgrounds";

import VoiceRecorder from "../components/VoiceRecorder";
import MessageReactions from "../components/MessageReactions";
import PollContent from "../components/PollContent";
import ImageLightbox from "../components/ImageLightbox";
import CallsTab from "../components/CallsTab";
import StatusTab from "../components/StatusTab";
import CommunitiesTab from "../components/CommunitiesTab";
import { playMessageSound } from "../utils/sound";
import { soundFX } from "../utils/soundEffects";
import { toast } from "../utils/toast";

const CallModal = lazy(() => import("../components/CallModal"));
const CreateGroupModal = lazy(() => import("../components/CreateGroupModal"));
const GroupInfoModal = lazy(() => import("../components/GroupInfoModal"));
const ProfileModal = lazy(() => import("../components/ProfileModal"));

// Format timestamp WhatsApp-style (e.g. "10:45 AM", "Yesterday", or "Oct 1")
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Format Last Seen status
const formatLastSeen = (dateStr) => {
  if (!dateStr) return "Offline";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Offline";
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Last seen today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Last seen yesterday at ${timeStr}`;

  return `Last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
};

// Highlight matched search text
const renderHighlightedText = (text, query) => {
  if (!query || !query.trim() || !text) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span
        key={i}
        style={{
          background: "#ef4444",
          color: "#ffffff",
          fontWeight: "bold",
          padding: "1px 4px",
          borderRadius: "3px",
        }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
};

function Chat() {
  const { userId: paramId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const { socket, onlineUsers, startCall } = useSocket();

  const chatBg = getChatBackground(user?._id);

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "groups"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChat, setActiveChat] = useState(null); // { type: "user"|"group", data: object }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [conversationsMeta, setConversationsMeta] = useState({}); // { [id]: { lastMessage, timestamp, unreadCount, isNew } }

  // Phase 2 states
  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");
  const [userLastSeenMap, setUserLastSeenMap] = useState({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState("chats"); // "chats" | "status" | "calls" | "communities"
  const [ghostMode, setGhostMode] = useState(false); // Stealth mode (no read receipts, untraceable pulses)
  const [burnDuration, setBurnDuration] = useState(0); // 0 = normal, 5, 10, 30 seconds
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 820px)");
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const [burningMessages, setBurningMessages] = useState({}); // { [msgId]: secondsRemaining }

  // Countdown timer for self-destruct messages
  const startLocalCountdown = (messageId, durationSec) => {
    let timeLeft = durationSec || 10;
    setBurningMessages((prev) => ({ ...prev, [messageId]: timeLeft }));

    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(interval);
        burnMessageApi(messageId).catch(() => {});
        socket.emit("message_burned", {
          messageId,
          receiverId: activeChat?.type === "user" ? activeChat.data._id : null,
          groupId: activeChat?.type === "group" ? activeChat.data._id : null,
        });
        soundFX.playBurnChime();
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        setBurningMessages((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      } else {
        setBurningMessages((prev) => ({ ...prev, [messageId]: timeLeft }));
      }
    }, 1000);
  };

  // Recipient taps to reveal burn message
  const handleRevealBurnMessage = async (msg) => {
    try {
      await openBurnMessageApi(msg._id);
      const duration = msg.burnDuration || 10;
      socket.emit("burn_started", {
        messageId: msg._id,
        receiverId: activeChat?.type === "user" ? activeChat.data._id : null,
        duration,
      });
      startLocalCountdown(msg._id, duration);
    } catch (e) {
      console.error("Reveal burn message failed:", e);
    }
  };

  // Initiate call and record call log
  const handleInitiateCall = (target, type) => {
    startCall(target, type);
    createCallLogApi({
      receiver: target._id,
      callType: type,
      status: "answered",
    }).catch(() => {});
  };

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  // Clear any pending typing-timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Throttled typing emitter: max 1 "typing" event per 2s, "stop_typing" 3s after last keystroke
  const emitTyping = () => {
    if (!activeChat || !socket) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      lastTypingEmitRef.current = now;
      socket.emit("typing", {
        sender: user._id,
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        sender: user._id,
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
      });
    }, 3000);
  };

  // Request desktop notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Immediately move active conversation to index 0 of contacts list
  const moveToTop = (convId, isGroup = false) => {
    if (!convId) return;
    const strId = String(convId);
    if (isGroup) {
      setGroups((prev) => {
        const idx = prev.findIndex((g) => String(g._id) === strId);
        if (idx <= 0) return prev;
        const target = prev[idx];
        const remaining = prev.filter((_, i) => i !== idx);
        return [target, ...remaining];
      });
    } else {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => String(u._id) === strId);
        if (idx <= 0) return prev;
        const target = prev[idx];
        const remaining = prev.filter((_, i) => i !== idx);
        return [target, ...remaining];
      });
    }
  };

  // Select chat and clear its unread/highlight status
  const handleSelectChat = (item, type) => {
    setActiveChat({ type, data: item });
    setReplyingTo(null);
    setShowInChatSearch(false);
    setInChatSearchQuery("");
    const id = String(item._id);
    setConversationsMeta((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        unreadCount: 0,
        isNew: false,
      },
    }));
  };

  // Load initial contacts (users and groups) and recent summaries
  const loadContacts = async () => {
    try {
      const allUsers = await getAllUsers();
      const filteredUsers = allUsers.filter((u) => u._id !== user?._id);
      setUsers(filteredUsers);

      const userGroups = await getUserGroupsApi();
      setGroups(userGroups);

      try {
        const summary = await getConversationsSummaryApi();
        setConversationsMeta(summary || {});
      } catch (err) {
        console.error("Failed to load conversation summaries:", err);
      }

      // Auto-select chat if paramId is provided in URL
      if (paramId) {
        const targetUser = filteredUsers.find((u) => u._id === paramId);
        if (targetUser) {
          handleSelectChat(targetUser, "user");
        } else {
          const targetGroup = userGroups.find((g) => g._id === paramId);
          if (targetGroup) {
            handleSelectChat(targetGroup, "group");
            setActiveTab("groups");
          }
        }
      } else if (filteredUsers.length > 0 && !activeChat) {
        handleSelectChat(filteredUsers[0], "user");
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  useEffect(() => {
    if (user?._id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern; setState runs after await
      loadContacts();
    }
  }, [user, paramId]);

  // Load active chat messages
  const loadActiveMessages = async () => {
    if (!activeChat) return;
    try {
      let data = [];
      if (activeChat.type === "user") {
        data = await getDirectMessages(activeChat.data._id);
        if (!ghostMode) {
          socket.emit("message_seen", { sender: activeChat.data._id, receiver: user._id });
        }
      } else if (activeChat.type === "group") {
        data = await getGroupMessages(activeChat.data._id);
        socket.emit("join_group", activeChat.data._id);
      }
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern; setState runs after await
    loadActiveMessages();
  }, [activeChat, ghostMode]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // Socket event listeners for real-time messages & reactions
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      const senderId = msg.sender?._id ? String(msg.sender._id) : String(msg.sender || "");
      const receiverId = msg.receiver?._id ? String(msg.receiver._id) : String(msg.receiver || "");
      const groupId = msg.group?._id ? String(msg.group._id) : String(msg.group || "");
      const activeId = activeChat ? String(activeChat.data._id) : "";
      const myId = String(user?._id || "");

      // Audio & Desktop Notification if incoming from someone else
      if (senderId && senderId !== myId) {
        soundFX.playMessageChime();
        playMessageSound();
        if ("Notification" in window && Notification.permission === "granted") {
          const senderName = msg.sender?.name || "Stalk";
          let notifSnippet = msg.message;
          if (msg.mediaType === "audio") notifSnippet = "🎙️ Voice note";
          else if (msg.mediaType === "image") notifSnippet = "📷 Photo";
          else if (msg.mediaType === "file") notifSnippet = "📎 " + (msg.fileName || "File");
          else if (msg.mediaType === "poll") notifSnippet = "📊 Poll: " + (msg.pollData?.question || "Poll");

          try {
            new Notification(senderName, {
              body: notifSnippet || "Sent a message",
              icon: msg.sender?.profilePic || "/favicon.ico",
            });
          } catch (e) {
            console.error("Desktop notification error:", e);
          }
        }
      }

      // Determine conversation key
      const convKey = groupId || (senderId === myId ? receiverId : senderId);
      const isGroup = Boolean(groupId);

      const isCurrentChat =
        (activeChat?.type === "user" && (senderId === activeId || receiverId === activeId)) ||
        (activeChat?.type === "group" && groupId === activeId);

      // Extract message snippet
      let snippet = msg.message;
      if (msg.mediaType === "audio") snippet = "🎙️ Voice note";
      else if (msg.mediaType === "image") snippet = "📷 Photo";
      else if (msg.mediaType === "file") snippet = "📎 " + (msg.fileName || "File");
      else if (msg.mediaType === "poll") snippet = "📊 Poll: " + (msg.pollData?.question || "Poll");

      // Update conversations metadata & move to top of sidebar
      if (convKey) {
        moveToTop(convKey, isGroup);
        setConversationsMeta((prev) => {
          const prevItem = prev[convKey] || {};
          return {
            ...prev,
            [convKey]: {
              lastMessage: snippet || "New message",
              timestamp: msg.createdAt || new Date().toISOString(),
              unreadCount: isCurrentChat ? 0 : (prevItem.unreadCount || 0) + 1,
              isNew: !isCurrentChat,
            },
          };
        });
      }

      if (isCurrentChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });

        if (activeChat.type === "user" && senderId === activeId && !ghostMode) {
          socket.emit("message_seen", { sender: activeChat.data._id, receiver: user._id });
        }
      }
    };

    const handleReaction = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    };

    const handleUserTyping = (data) => {
      const senderId = data?.sender?._id ? String(data.sender._id) : String(data?.sender || "");
      const groupId = data?.group?._id ? String(data.group._id) : String(data?.group || "");
      const activeId = String(activeChat?.data._id);

      if (activeChat?.type === "user" && senderId === activeId) {
        setTypingUser(activeChat.data.name);
      } else if (activeChat?.type === "group" && groupId === activeId) {
        setTypingUser("Someone");
      }
    };

    const handleUserStopTyping = () => {
      setTypingUser("");
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, message: "This message was deleted", mediaUrl: null } : m
        )
      );
    };

    const handleUserLastSeen = (data) => {
      if (data?.userId) {
        setUserLastSeenMap((prev) => ({
          ...prev,
          [String(data.userId)]: data.lastSeen,
        }));
      }
    };

    const handleAvatarUpdated = ({ userId, profilePic }) => {
      const targetId = String(userId);
      setUsers((prev) =>
        prev.map((u) => (String(u._id) === targetId ? { ...u, profilePic } : u))
      );
      if (activeChat?.type === "user" && String(activeChat.data._id) === targetId) {
        setActiveChat((prev) => ({
          ...prev,
          data: { ...prev.data, profilePic },
        }));
      }
    };

    const handleMessageBurned = (data) => {
      soundFX.playBurnChime();
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
      setBurningMessages((prev) => {
        const copy = { ...prev };
        delete copy[data.messageId];
        return copy;
      });
    };

    const handleBurnStarted = (data) => {
      startLocalCountdown(data.messageId, data.duration);
    };

    const handleGroupUpdated = (data) => {
      const group = data?.members ? data : data?.group;
      const deletedId = data?.deleted ? data.groupId : null;
      const groupId = deletedId || group?._id;
      if (!groupId) return;

      if (deletedId || !group) {
        setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
        setActiveChat((prev) =>
          prev?.type === "group" && String(prev.data._id) === String(groupId) ? null : prev
        );
        setGroupInfoOpen(false);
        return;
      }

      const selfId = String(user?._id);
      const stillMember = (group.members || []).some(
        (m) => String(m?._id || m) === selfId
      );

      if (!stillMember) {
        // Removed by admin (or group data without us): leave room, drop group, close chat
        socket.emit("leave_group", groupId);
        setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
        setActiveChat((prev) =>
          prev?.type === "group" && String(prev.data._id) === String(groupId) ? null : prev
        );
        setGroupInfoOpen(false);
        toast.error(`You were removed from "${group.name}"`);
        return;
      }

      setGroups((prev) => {
        const exists = prev.some((g) => String(g._id) === String(groupId));
        if (!exists) return [group, ...prev];
        return prev.map((g) => (String(g._id) === String(groupId) ? group : g));
      });
      setActiveChat((prev) =>
        prev?.type === "group" && String(prev.data._id) === String(groupId)
          ? { ...prev, data: group }
          : prev
      );
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("receive_reaction", handleReaction);
    socket.on("receive_poll_vote", handleReaction);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("user_last_seen", handleUserLastSeen);
    socket.on("avatar_updated", handleAvatarUpdated);
    socket.on("burn_started", handleBurnStarted);
    socket.on("message_burned", handleMessageBurned);
    socket.on("group_updated", handleGroupUpdated);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("receive_reaction", handleReaction);
      socket.off("receive_poll_vote", handleReaction);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("user_last_seen", handleUserLastSeen);
      socket.off("avatar_updated", handleAvatarUpdated);
      socket.off("burn_started", handleBurnStarted);
      socket.off("message_burned", handleMessageBurned);
      socket.off("group_updated", handleGroupUpdated);
    };
  }, [activeChat, user, ghostMode]);

  // Own photo updated handler
  const handleOwnPhotoUpdated = (newPhotoUrl) => {
    setUser((prev) => ({ ...prev, profilePic: newPhotoUrl }));
    socket.emit("update_avatar", { userId: user._id, profilePic: newPhotoUrl });
  };

  // Delete message for everyone
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteApiMessage(msgId);
      socket.emit("delete_message", { messageId: msgId });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId ? { ...m, isDeleted: true, message: "This message was deleted", mediaUrl: null } : m
        )
      );
    } catch (err) {
      console.error("Delete message failed:", err);
    }
  };

  // Send Text Message
  const handleSendText = async () => {
    if (!newMessage.trim() || !activeChat) return;
    const text = newMessage;
    const currentReply = replyingTo;
    const currentBurnDuration = burnDuration;
    setNewMessage("");
    setReplyingTo(null);
    setShowVoiceRecorder(false);

    try {
      const payload = {
        message: text,
        mediaType: "text",
        replyTo: currentReply ? currentReply._id : null,
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
        isBurnAfterReading: currentBurnDuration > 0,
        burnDuration: currentBurnDuration,
      };

      const sentMsg = await sendApiMessage(payload);
      socket.emit("send_message", sentMsg);
      socket.emit("stop_typing", {
        sender: user._id,
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
      });

      // Move conversation to top & update sidebar metadata
      const activeId = String(activeChat.data._id);
      moveToTop(activeId, activeChat.type === "group");
      setConversationsMeta((prev) => ({
        ...prev,
        [activeId]: {
          lastMessage: text,
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isNew: false,
        },
      }));

      setMessages((prev) => [...prev, sentMsg]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Send Audio / Voice Note Message
  const handleSendVoiceNote = async (url, mediaType, fileName) => {
    if (!activeChat) return;
    try {
      const payload = {
        message: "Voice note",
        mediaUrl: url,
        mediaType: mediaType || "audio",
        fileName: fileName || "voice-note.webm",
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
      };

      const sentMsg = await sendApiMessage(payload);
      socket.emit("send_message", sentMsg);

      // Move conversation to top & update sidebar metadata
      const activeId = String(activeChat.data._id);
      moveToTop(activeId, activeChat.type === "group");
      setConversationsMeta((prev) => ({
        ...prev,
        [activeId]: {
          lastMessage: "🎙️ Voice note",
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isNew: false,
        },
      }));

      setMessages((prev) => [...prev, sentMsg]);
      setShowVoiceRecorder(false);
    } catch (err) {
      console.error("Failed to send voice note:", err);
    }
  };

  // File Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    try {
      setUploadingFile(true);
      const uploaded = await uploadFileApi(file);

      const payload = {
        message: file.name,
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType,
        fileName: uploaded.fileName,
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
      };

      const sentMsg = await sendApiMessage(payload);
      socket.emit("send_message", sentMsg);

      // Move conversation to top & update sidebar metadata
      const activeId = String(activeChat.data._id);
      moveToTop(activeId, activeChat.type === "group");
      setConversationsMeta((prev) => ({
        ...prev,
        [activeId]: {
          lastMessage: uploaded.mediaType === "image" ? "📷 Photo" : "📎 " + (uploaded.fileName || "File"),
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isNew: false,
        },
      }));

      setMessages((prev) => [...prev, sentMsg]);
    } catch (err) {
      console.error("File upload error:", err);
      toast.error(err.response?.data?.message || "Failed to upload file attachment");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Emoji Reaction Handler
  const handleReact = async (messageId, emoji) => {
    try {
      const updatedMsg = await reactToApiMessage(messageId, emoji);
      socket.emit("message_reaction", updatedMsg);
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  // Send Poll Message
  const handleSendPoll = async () => {
    if (!activeChat) return;
    const question = pollQuestion.trim();
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      toast.error("Poll needs a question and at least 2 options");
      return;
    }

    try {
      const payload = {
        message: "",
        mediaType: "poll",
        pollData: {
          question,
          options: options.map((text) => ({ text, votes: [] })),
        },
        receiver: activeChat.type === "user" ? activeChat.data._id : null,
        group: activeChat.type === "group" ? activeChat.data._id : null,
      };

      const sentMsg = await sendApiMessage(payload);
      socket.emit("send_message", sentMsg);

      const activeId = String(activeChat.data._id);
      moveToTop(activeId, activeChat.type === "group");
      setConversationsMeta((prev) => ({
        ...prev,
        [activeId]: {
          lastMessage: "📊 Poll: " + question,
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isNew: false,
        },
      }));

      setMessages((prev) => [...prev, sentMsg]);
      setShowPollModal(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
    } catch (err) {
      console.error("Failed to send poll:", err);
      toast.error(err.response?.data?.message || "Failed to create poll");
    }
  };

  // Vote on a Poll Option
  const handleVote = async (messageId, optionIndex) => {
    try {
      const updatedMsg = await votePollApi(messageId, optionIndex);
      socket.emit("poll_vote", updatedMsg);
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    } catch (err) {
      console.error("Vote failed:", err);
      toast.error(err.response?.data?.message || "Failed to vote");
    }
  };

  // Helper to format media URL
  const formatMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BASE_URL}${url}`;
  };

  // Filtered and sorted lists for search (WhatsApp-style: newest activity on top)
  const sortedUsers = [...users]
    .filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const timeA = new Date(conversationsMeta[String(a._id)]?.timestamp || 0).getTime();
      const timeB = new Date(conversationsMeta[String(b._id)]?.timestamp || 0).getTime();
      return timeB - timeA;
    });

  const sortedGroups = [...groups]
    .filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const timeA = new Date(conversationsMeta[String(a._id)]?.timestamp || 0).getTime();
      const timeB = new Date(conversationsMeta[String(b._id)]?.timestamp || 0).getTime();
      return timeB - timeA;
    });

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#0a0a0a",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Full Screen Image Lightbox */}
      <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />

      {/* Profile Photo Modal (View, Change, Delete) */}
      <Suspense fallback={null}>
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          user={user}
          onPhotoUpdated={handleOwnPhotoUpdated}
          onViewPhoto={(url) => {
            setProfileModalOpen(false);
            setLightboxImage(url);
          }}
        />

        {/* Voice / Video Call Overlay Modal */}
        <CallModal />

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          users={users}
          onGroupCreated={(newGroup) => {
            setGroups((prev) => [newGroup, ...prev]);
            handleSelectChat(newGroup, "group");
            setActiveTab("groups");
          }}
        />

        {/* Group Info Modal */}
        <GroupInfoModal
          isOpen={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          group={activeChat?.type === "group" ? activeChat.data : null}
          currentUser={user}
          contacts={users}
          socket={socket}
          onGroupUpdated={(updatedGroup) => {
            setGroups((prev) =>
              prev.some((g) => String(g._id) === String(updatedGroup._id))
                ? prev.map((g) => (String(g._id) === String(updatedGroup._id) ? updatedGroup : g))
                : [updatedGroup, ...prev]
            );
            setActiveChat((prev) =>
              prev?.type === "group" && String(prev.data._id) === String(updatedGroup._id)
                ? { ...prev, data: updatedGroup }
                : prev
            );
          }}
          onSelfLeft={(groupId, message) => {
            setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
            setActiveChat((prev) =>
              prev?.type === "group" && String(prev.data._id) === String(groupId) ? null : prev
            );
            setGroupInfoOpen(false);
            toast.success(message);
          }}
        />
      </Suspense>

      {/* Create Poll Modal */}
      {showPollModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPollModal(false)}
        >
          <div
            className="modal-panel"
            style={{
              background: "#131315",
              border: "1px solid #27272a",
              borderRadius: "16px",
              padding: "24px",
              width: "380px",
              maxWidth: "90vw",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BarChart3 size={20} color="#ef4444" />
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  Create Poll
                </h2>
              </div>
              <button
                onClick={() => setShowPollModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#a1a1aa",
                  cursor: "pointer",
                  padding: "4px",
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "6px", fontWeight: "600" }}>
              QUESTION
            </label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendPoll();
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                color: "white",
                outline: "none",
                fontSize: "14px",
                marginBottom: "16px",
                boxSizing: "border-box",
              }}
              autoFocus
            />

            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "6px", fontWeight: "600" }}>
              OPTIONS
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {pollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) =>
                      setPollOptions((prev) =>
                        prev.map((o, i) => (i === idx ? e.target.value : o))
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendPoll();
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#0a0a0a",
                      border: "1px solid #27272a",
                      color: "white",
                      outline: "none",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() =>
                        setPollOptions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#71717a",
                        cursor: "pointer",
                        padding: "4px",
                        flexShrink: 0,
                      }}
                      title="Remove option"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {pollOptions.length < 10 && (
              <button
                onClick={() => setPollOptions((prev) => [...prev, ""])}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "1px dashed #3f3f46",
                  borderRadius: "10px",
                  color: "#f87171",
                  cursor: "pointer",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  width: "100%",
                  justifyContent: "center",
                  marginBottom: "18px",
                }}
              >
                <Plus size={15} /> Add Option
              </button>
            )}

            <button
              onClick={handleSendPoll}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #dc2626, #991b1b)",
                border: "none",
                color: "white",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Send Poll
            </button>
          </div>
        </div>
      )}

      {/* FAR-LEFT ICON DOCK (WHATSAPP NAVIGATION) */}
      <div
        style={{
          width: "68px",
          background: "#08080a",
          borderRight: "1px solid #27272a",
          display: isMobile && activeChat ? "none" : "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          {/* Transmissions (Chats) */}
          <button
            onClick={() => setSidebarView("chats")}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: sidebarView === "chats" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
              border: "none",
              color: sidebarView === "chats" ? "white" : "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: sidebarView === "chats" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
            }}
            title="Transmissions (Chats)"
          >
            <MessageSquare size={20} />
          </button>

          {/* Pulses (24h Stories) */}
          <button
            onClick={() => setSidebarView("status")}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: sidebarView === "status" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
              border: "none",
              color: sidebarView === "status" ? "white" : "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: sidebarView === "status" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
            }}
            title="Pulses (24h Ephemeral Stories)"
          >
            <CircleDot size={20} />
          </button>

          {/* Networks (Communities) */}
          <button
            onClick={() => setSidebarView("communities")}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: sidebarView === "communities" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
              border: "none",
              color: sidebarView === "communities" ? "white" : "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: sidebarView === "communities" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
            }}
            title="Networks (Topic Hubs)"
          >
            <Globe size={20} />
          </button>

          {/* Comms Grid (Calls) */}
          <button
            onClick={() => setSidebarView("calls")}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: sidebarView === "calls" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
              border: "none",
              color: sidebarView === "calls" ? "white" : "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: sidebarView === "calls" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
            }}
            title="Comms Grid (Audio & Video)"
          >
            <PhoneCall size={20} />
          </button>

          {/* Stuny — AI Wellness Companion */}
          <button
            onClick={() => navigate("/assistant")}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f59e0b, #dc2626)",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.45)",
            }}
            title="Stuny — your AI wellness companion"
          >
            <Sparkles size={20} />
          </button>

          {/* Ghost Mode Stealth Toggle */}
          <button
            onClick={() => setGhostMode((prev) => !prev)}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: ghostMode ? "#581c87" : "#18181b",
              border: ghostMode ? "1px solid #c084fc" : "1px solid #27272a",
              color: ghostMode ? "#f3e8ff" : "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: ghostMode ? "0 0 16px rgba(192, 132, 252, 0.6)" : "none",
            }}
            title={ghostMode ? "Ghost Mode Active: Stealth (Untraceable reading & viewing)" : "Enable Ghost Mode (Stealth browsing)"}
          >
            <Ghost size={20} />
          </button>
        </div>

        {/* Bottom User DP + Logout */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => setProfileModalOpen(true)}
            title="Profile & Settings"
          >
            <img
              src={
                user?.profilePic ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
              }
              alt={user?.name}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #ef4444",
                display: "block",
              }}
            />
          </div>

          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "none",
              color: "#71717a",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            title="Logout"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* SECONDARY SIDEBAR PANEL */}
      <div
        style={{
          width: isMobile ? undefined : "350px",
          flex: isMobile ? "1 1 auto" : "0 0 350px",
          minWidth: 0,
          background: "#111113",
          borderRight: "1px solid #27272a",
          display: isMobile && activeChat ? "none" : "flex",
          flexDirection: "column",
        }}
      >
        {sidebarView === "status" ? (
          <StatusTab currentUser={user} socket={socket} ghostMode={ghostMode} />
        ) : sidebarView === "calls" ? (
          <CallsTab
            users={users}
            currentUser={user}
            onStartCall={handleInitiateCall}
            onViewAvatar={(url) => setLightboxImage(url)}
          />
        ) : sidebarView === "communities" ? (
          <CommunitiesTab
            groups={groups}
            currentUser={user}
            socket={socket}
            onSelectGroup={(g) => {
              handleSelectChat(g, "group");
              setSidebarView("chats");
            }}
          />
        ) : (
          <>
            {/* User Profile Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0a0a0a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => setProfileModalOpen(true)}
              title="Click to view, change, or remove profile photo"
            >
              <img
                src={user?.profilePic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"}
                alt={user?.name}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #ef4444",
                  display: "block",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#dc2626",
                  border: "2px solid #0a0a0a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <Camera size={9} />
              </div>
            </div>
            <div onClick={() => setProfileModalOpen(true)} style={{ cursor: "pointer" }}>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#ffffff" }}>
                {user?.name || "User"}
              </h4>
              <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "500" }}>Online • Edit DP</span>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              background: "#1c1917",
              border: "1px solid #27272a",
              color: "#f87171",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              transition: "background 0.2s",
            }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "14px 16px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "12px",
              padding: "10px 14px",
            }}
          >
            <Search size={16} style={{ color: "#71717a", marginRight: "10px" }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: "white",
                outline: "none",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Navigation Tabs (Direct vs Groups) */}
        <div style={{ padding: "8px 16px", display: "flex", gap: "8px", borderBottom: "1px solid #27272a" }}>
          <button
            onClick={() => setActiveTab("direct")}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "direct" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
              color: activeTab === "direct" ? "white" : "#a1a1aa",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: activeTab === "direct" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <UserIcon size={15} /> Direct
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "groups" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
              color: activeTab === "groups" ? "white" : "#a1a1aa",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: activeTab === "groups" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <UsersIcon size={15} /> Groups
          </button>
        </div>

        {/* List Header / Add Group Button */}
        <div
          style={{
            padding: "12px 16px 8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#71717a", fontWeight: "700", letterSpacing: "0.5px" }}>
            {activeTab === "direct" ? "Recent Chats" : "Group Chats"}
          </span>
          {activeTab === "groups" && (
            <button
              onClick={() => setCreateGroupOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: "600",
              }}
            >
              <Plus size={14} /> New Group
            </button>
          )}
        </div>

        {/* Contacts List with WhatsApp Style Snippets, Badges & Highlights */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {activeTab === "direct" ? (
            sortedUsers.length === 0 ? (
              <p style={{ color: "#71717a", textAlign: "center", marginTop: "30px", fontSize: "14px" }}>
                No users found
              </p>
            ) : (
              sortedUsers.map((u) => {
                const isOnline = onlineUsers.includes(u._id);
                const isSelected = activeChat?.type === "user" && activeChat.data._id === u._id;
                const meta = conversationsMeta[String(u._id)] || {};
                const isUnread = (meta.unreadCount || 0) > 0;
                const isHighlighted = meta.isNew || isUnread;

                return (
                  <div
                    key={u._id}
                    onClick={() => handleSelectChat(u, "user")}
                    className={`chat-row${isSelected ? " is-selected" : ""}${isHighlighted ? " is-highlighted" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      background: isSelected
                        ? "#241417"
                        : isHighlighted
                        ? "rgba(220, 38, 38, 0.16)"
                        : "transparent",
                      border: isHighlighted
                        ? "1px solid #ef4444"
                        : isSelected
                        ? "1px solid #7f1d1d"
                        : "1px solid transparent",
                      marginBottom: "6px",
                      transition: "all 0.2s ease",
                      boxShadow: isHighlighted ? "0 0 12px rgba(239, 68, 68, 0.35)" : "none",
                    }}
                  >
                    <div
                      style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage(u.profilePic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80");
                      }}
                      title="Click to view full photo"
                    >
                      <img
                        src={u.profilePic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"}
                        alt={u.name}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: isHighlighted ? "2px solid #ef4444" : "1px solid #27272a",
                          transition: "transform 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "0",
                          right: "0",
                          width: "11px",
                          height: "11px",
                          borderRadius: "50%",
                          background: isOnline ? "#22c55e" : "#52525b",
                          border: "2px solid #111113",
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: isUnread ? "700" : "500",
                            color: isUnread ? "#ffffff" : isSelected ? "#ffffff" : "#e4e4e7",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.name}
                        </h4>
                        {meta.timestamp && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: isUnread ? "#ef4444" : "#71717a",
                              fontWeight: isUnread ? "700" : "normal",
                              flexShrink: 0,
                              marginLeft: "6px",
                            }}
                          >
                            {formatTimeAgo(meta.timestamp)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: isUnread ? "#fca5a5" : "#a1a1aa",
                            fontWeight: isUnread ? "600" : "normal",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {meta.lastMessage || (isOnline ? "🟢 Online" : "Offline")}
                        </p>

                        {isUnread && (
                          <span
                            style={{
                              background: "#dc2626",
                              color: "#ffffff",
                              borderRadius: "10px",
                              padding: "2px 7px",
                              fontSize: "11px",
                              fontWeight: "700",
                              minWidth: "18px",
                              textAlign: "center",
                              boxShadow: "0 0 10px rgba(220, 38, 38, 0.7)",
                              flexShrink: 0,
                            }}
                          >
                            {meta.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : sortedGroups.length === 0 ? (
            <p style={{ color: "#71717a", textAlign: "center", marginTop: "30px", fontSize: "14px" }}>
              No groups created yet
            </p>
          ) : (
            sortedGroups.map((g) => {
              const isSelected = activeChat?.type === "group" && activeChat.data._id === g._id;
              const meta = conversationsMeta[String(g._id)] || {};
              const isUnread = (meta.unreadCount || 0) > 0;
              const isHighlighted = meta.isNew || isUnread;

              return (
                <div
                  key={g._id}
                  onClick={() => handleSelectChat(g, "group")}
                  className={`chat-row${isSelected ? " is-selected" : ""}${isHighlighted ? " is-highlighted" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    background: isSelected
                      ? "#241417"
                      : isHighlighted
                      ? "rgba(220, 38, 38, 0.16)"
                      : "transparent",
                    border: isHighlighted
                      ? "1px solid #ef4444"
                      : isSelected
                      ? "1px solid #7f1d1d"
                      : "1px solid transparent",
                    marginBottom: "6px",
                    transition: "all 0.2s ease",
                    boxShadow: isHighlighted ? "0 0 12px rgba(239, 68, 68, 0.35)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "18px",
                      flexShrink: 0,
                      boxShadow: "0 4px 10px rgba(220, 38, 38, 0.3)",
                    }}
                  >
                    {g.name[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: isUnread ? "700" : "500",
                          color: isUnread ? "#ffffff" : isSelected ? "#ffffff" : "#e4e4e7",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {g.name}
                      </h4>
                      {meta.timestamp && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: isUnread ? "#ef4444" : "#71717a",
                            fontWeight: isUnread ? "700" : "normal",
                            flexShrink: 0,
                            marginLeft: "6px",
                          }}
                        >
                          {formatTimeAgo(meta.timestamp)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: isUnread ? "#fca5a5" : "#a1a1aa",
                          fontWeight: isUnread ? "600" : "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {meta.lastMessage || `${g.members?.length || 0} members`}
                      </p>

                      {isUnread && (
                        <span
                          style={{
                            background: "#dc2626",
                            color: "#ffffff",
                            borderRadius: "10px",
                            padding: "2px 7px",
                            fontSize: "11px",
                            fontWeight: "700",
                            minWidth: "18px",
                            textAlign: "center",
                            boxShadow: "0 0 10px rgba(220, 38, 38, 0.7)",
                            flexShrink: 0,
                          }}
                        >
                          {meta.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    )}
  </div>

      {/* MAIN ACTIVE CHAT AREA - SLEEK OBSIDIAN & RED */}
      {activeChat ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#080809" }}>
          {/* Chat Header */}
          <div
            style={{
              padding: "16px 24px",
              background: "#111113",
              borderBottom: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: activeChat.type === "group" ? "pointer" : "default",
              }}
              onClick={() => {
                if (activeChat.type === "group") setGroupInfoOpen(true);
              }}
              title={activeChat.type === "group" ? "View group info" : undefined}
            >
              {isMobile && (
                <button
                  onClick={() => setActiveChat(null)}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Back to chats"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              {activeChat.type === "user" ? (
                <>
                  <div
                    style={{ position: "relative", cursor: "pointer" }}
                    onClick={() =>
                      setLightboxImage(
                        activeChat.data.profilePic ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                      )
                    }
                    title="Click to view full photo"
                  >
                    <img
                      src={
                        activeChat.data.profilePic ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                      }
                      alt={activeChat.data.name}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid #27272a",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: onlineUsers.includes(activeChat.data._id) ? "#22c55e" : "#52525b",
                        border: "2px solid #111113",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#ffffff" }}>{activeChat.data.name}</h3>
                      {ghostMode && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            background: "rgba(88, 28, 135, 0.45)",
                            border: "1px solid #c084fc",
                            color: "#e9d5ff",
                            padding: "2px 7px",
                            borderRadius: "10px",
                            boxShadow: "0 0 8px rgba(192, 132, 252, 0.4)",
                          }}
                        >
                          👻 STEALTH
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: onlineUsers.includes(activeChat.data._id) ? "#22c55e" : "#71717a" }}>
                      {onlineUsers.includes(activeChat.data._id)
                        ? "Online"
                        : formatLastSeen(userLastSeenMap[String(activeChat.data._id)] || activeChat.data.lastSeen)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    {activeChat.data.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#ffffff" }}>{activeChat.data.name}</h3>
                    <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                      Group • {activeChat.data.members?.length || 0} members
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Chat Action Buttons (Search, Audio, Video) */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={() => setShowInChatSearch((prev) => !prev)}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: showInChatSearch ? "#dc2626" : "#18181b",
                  border: "1px solid #27272a",
                  color: showInChatSearch ? "white" : "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                title="Search messages in this chat"
              >
                <Search size={18} />
              </button>

              {activeChat.type === "user" && (
                <>
                  <button
                    onClick={() => handleInitiateCall(activeChat.data, "audio")}
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.15s, background 0.2s",
                    }}
                    title="Voice Call"
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    onClick={() => handleInitiateCall(activeChat.data, "video")}
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.15s, background 0.2s",
                    }}
                    title="Video Call"
                  >
                    <Video size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* In-Chat Message Search Bar */}
          {showInChatSearch && (
            <div
              style={{
                padding: "10px 24px",
                background: "#141416",
                borderBottom: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Search size={16} style={{ color: "#ef4444" }} />
              <input
                type="text"
                placeholder="Search messages in this chat..."
                value={inChatSearchQuery}
                onChange={(e) => setInChatSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {inChatSearchQuery && (
                <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                  {messages.filter((m) => m.message?.toLowerCase().includes(inChatSearchQuery.toLowerCase())).length} found
                </span>
              )}
              <button
                onClick={() => {
                  setShowInChatSearch(false);
                  setInChatSearchQuery("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#71717a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              ...(buildChatBgStyle(chatBg) || { background: DEFAULT_CHAT_BG }),
            }}
          >
            {messages.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#71717a" }}>
                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: "12px", color: "#ef4444" }} />
                <p>No messages yet. Send a message to start!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMyMessage = msg.sender?._id === user?._id || msg.sender === user?._id;

                return (
                  <div
                    key={msg._id}
                    className="msg-bubble-wrapper"
                    style={{
                      display: "flex",
                      justifyContent: isMyMessage ? "flex-end" : "flex-start",
                      alignItems: "flex-end",
                      gap: "8px",
                      position: "relative",
                    }}
                  >
                    {/* Action buttons on left for my messages */}
                    {isMyMessage && !msg.isDeleted && (
                      <div
                        className="msg-actions-bar"
                        style={{
                          display: "flex",
                          gap: "4px",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <button
                          onClick={() => setReplyingTo(msg)}
                          title="Reply"
                          style={{
                            background: "#1c1917",
                            border: "1px solid #27272a",
                            borderRadius: "6px",
                            color: "#a1a1aa",
                            cursor: "pointer",
                            padding: "5px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Reply size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          title="Delete for everyone"
                          style={{
                            background: "#1c1917",
                            border: "1px solid #27272a",
                            borderRadius: "6px",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "5px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "10px",
                        maxWidth: "70%",
                        flexDirection: isMyMessage ? "row-reverse" : "row",
                      }}
                    >
                      <img
                        src={
                          msg.sender?.profilePic ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                        }
                        alt={msg.sender?.name || "avatar"}
                        onClick={() =>
                          setLightboxImage(
                            msg.sender?.profilePic ||
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                          )
                        }
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginBottom: "4px",
                          border: isMyMessage ? "1px solid #7f1d1d" : "1px solid #27272a",
                          cursor: "pointer",
                          transition: "transform 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        title="Click to view full photo"
                      />

                      <div style={{ display: "flex", flexDirection: "column", alignItems: isMyMessage ? "flex-end" : "flex-start" }}>
                        {activeChat.type === "group" && !isMyMessage && (
                          <span style={{ fontSize: "11px", color: "#f87171", marginBottom: "4px", fontWeight: "600" }}>
                            {msg.sender?.name}
                          </span>
                        )}

                        <div
                          style={{
                            background: msg.isDeleted
                              ? "#141416"
                              : isMyMessage
                              ? "linear-gradient(135deg, #b91c1c, #dc2626)"
                              : "#18181b",
                            border: msg.isDeleted ? "1px dashed #3f3f46" : isMyMessage ? "none" : "1px solid #2e1d21",
                            color: "white",
                            padding: "12px 16px",
                            borderRadius: isMyMessage ? "18px 18px 3px 18px" : "18px 18px 18px 3px",
                            boxShadow: isMyMessage
                              ? "0 4px 14px rgba(220, 38, 38, 0.35)"
                              : "0 4px 10px rgba(0,0,0,0.5)",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.isDeleted ? (
                            <div style={{ fontSize: "13px", fontStyle: "italic", color: "#71717a", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>🚫 This message was deleted</span>
                            </div>
                          ) : (
                            <>
                              {/* Burn Shield for unrevealed messages */}
                              {msg.isBurnAfterReading && !isMyMessage && !msg.openedAt && burningMessages[msg._id] === undefined ? (
                                <div
                                  onClick={() => handleRevealBurnMessage(msg)}
                                  style={{
                                    cursor: "pointer",
                                    background: "rgba(0, 0, 0, 0.45)",
                                    border: "1px dashed #ef4444",
                                    borderRadius: "10px",
                                    padding: "12px 16px",
                                    textAlign: "center",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "6px",
                                    transition: "all 0.2s",
                                    boxShadow: "0 0 12px rgba(239, 68, 68, 0.25)",
                                  }}
                                  title="Click to reveal"
                                >
                                  <Flame size={24} color="#ef4444" />
                                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#fca5a5" }}>
                                    Self-Destruct Message ({msg.burnDuration || 10}s)
                                  </span>
                                  <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                                    Tap to reveal and trigger countdown
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {/* Burn countdown indicator if active */}
                                  {msg.isBurnAfterReading && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "rgba(220, 38, 38, 0.25)",
                                        border: "1px solid #ef4444",
                                        color: "#fca5a5",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        marginBottom: "8px",
                                      }}
                                    >
                                      <Flame size={14} color="#f87171" />
                                      <span>
                                        {burningMessages[msg._id] !== undefined
                                          ? `Dissolving in ${burningMessages[msg._id]}s...`
                                          : `Burn-after-reading: ${msg.burnDuration || 10}s`}
                                      </span>
                                    </div>
                                  )}
                                  {/* Quoted Reply Card */}
                                  {msg.replyTo && (
                                <div
                                  style={{
                                    borderLeft: "3px solid #f87171",
                                    background: "rgba(0, 0, 0, 0.3)",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    marginBottom: "8px",
                                    fontSize: "12px",
                                  }}
                                >
                                  <div style={{ fontWeight: "700", color: "#fca5a5", fontSize: "11px", marginBottom: "2px" }}>
                                    {msg.replyTo.sender?.name || (msg.replyTo.sender === user?._id ? "You" : "User")}
                                  </div>
                                  <div style={{ color: "#e4e4e7", fontStyle: msg.replyTo.isDeleted ? "italic" : "normal" }}>
                                    {msg.replyTo.isDeleted
                                      ? "This message was deleted"
                                      : msg.replyTo.message || (msg.replyTo.mediaType === "image" ? "📷 Photo" : "📎 Attachment")}
                                  </div>
                                </div>
                              )}

                              {/* Media Rendering */}
                              {msg.mediaType === "image" && msg.mediaUrl && (
                                <img
                                  src={formatMediaUrl(msg.mediaUrl)}
                                  alt="Attachment"
                                  onClick={() => setLightboxImage(formatMediaUrl(msg.mediaUrl))}
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "250px",
                                    borderRadius: "10px",
                                    marginBottom: msg.message ? "8px" : "0",
                                    display: "block",
                                    cursor: "pointer",
                                  }}
                                  title="Click to view full image"
                                />
                              )}

                              {msg.mediaType === "audio" && msg.mediaUrl && (
                                <audio
                                  src={formatMediaUrl(msg.mediaUrl)}
                                  controls
                                  style={{
                                    maxWidth: "240px",
                                    height: "36px",
                                    marginBottom: msg.message && msg.message !== "Voice note" ? "8px" : "0",
                                  }}
                                />
                              )}

                              {msg.mediaType === "file" && msg.mediaUrl && (
                                <a
                                  href={formatMediaUrl(msg.mediaUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: "#fca5a5",
                                    textDecoration: "none",
                                    fontWeight: "500",
                                    marginBottom: msg.message && msg.message !== msg.fileName ? "8px" : "0",
                                  }}
                                >
                                  <FileText size={20} />
                                  <span>{msg.fileName || "Download Attachment"}</span>
                                </a>
                              )}

                              {/* Poll Rendering */}
                              {msg.mediaType === "poll" && msg.pollData && (
                                <div style={{ marginBottom: msg.message ? "8px" : "0" }}>
                                  <PollContent
                                    pollData={msg.pollData}
                                    currentUserId={user?._id}
                                    onVote={(optIdx) => handleVote(msg._id, optIdx)}
                                  />
                                </div>
                              )}

                              {/* Text Content */}
                              {msg.message && msg.message !== "Voice note" && msg.message !== msg.fileName && (
                                  <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                                    {renderHighlightedText(msg.message, inChatSearchQuery)}
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}

                          {/* Time & Read Receipts */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "6px",
                              marginTop: "4px",
                              fontSize: "11px",
                              opacity: 0.85,
                            }}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {isMyMessage && !msg.isDeleted && (
                              <span>
                                {msg.seen ? (
                                  <CheckCheck size={14} style={{ color: "#ffffff" }} />
                                ) : (
                                  <Check size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Emoji Reactions Bar */}
                        {!msg.isDeleted && (
                          <MessageReactions
                            messageId={msg._id}
                            reactions={msg.reactions}
                            onReact={handleReact}
                            isMyMessage={isMyMessage}
                          />
                        )}
                      </div>
                    </div>

                    {/* Action buttons on right for other people's messages */}
                    {!isMyMessage && !msg.isDeleted && (
                      <div
                        className="msg-actions-bar"
                        style={{
                          display: "flex",
                          gap: "4px",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <button
                          onClick={() => setReplyingTo(msg)}
                          title="Reply"
                          style={{
                            background: "#1c1917",
                            border: "1px solid #27272a",
                            borderRadius: "6px",
                            color: "#a1a1aa",
                            cursor: "pointer",
                            padding: "5px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Reply size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {typingUser && (
              <div style={{ color: "#f87171", fontSize: "13px", fontStyle: "italic" }}>
                {typingUser} is typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview Bar */}
          {replyingTo && (
            <div
              style={{
                padding: "10px 24px",
                background: "#18181b",
                borderTop: "1px solid #27272a",
                borderLeft: "4px solid #ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#f87171" }}>
                  Replying to {replyingTo.sender?.name || (replyingTo.sender === user?._id ? "yourself" : "User")}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#d4d4d8",
                    maxWidth: "600px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {replyingTo.isDeleted
                    ? "This message was deleted"
                    : replyingTo.message || (replyingTo.mediaType === "image" ? "📷 Photo" : "📎 Attachment")}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#a1a1aa",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "6px",
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Chat Footer Input Area - RED & BLACK */}
          <div
            style={{
              padding: "16px 24px",
              background: "#111113",
              borderTop: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* File Attachment Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="composer-btn"
              title="Attach Image or File"
            >
              <Paperclip size={19} />
            </button>

            {/* Create Poll Button */}
            <button
              onClick={() => setShowPollModal(true)}
              className="composer-btn"
              title="Create Poll"
            >
              <BarChart3 size={19} />
            </button>

            {/* Burn-After-Reading Self Destruct Mode */}
            <button
              onClick={() => {
                setBurnDuration((prev) => (prev === 0 ? 5 : prev === 5 ? 10 : prev === 10 ? 30 : 0));
              }}
              className={`composer-btn${burnDuration > 0 ? " composer-btn--active" : ""}`}
              title={
                burnDuration > 0
                  ? `Self-Destruct Active: Dissolves ${burnDuration}s after opening`
                  : "Enable Burn-After-Reading (Self-Destruct Transmission)"
              }
            >
              <Flame size={19} />
              {burnDuration > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#ffffff",
                    color: "#dc2626",
                    fontSize: "10px",
                    fontWeight: "900",
                    borderRadius: "8px",
                    padding: "1px 5px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  {burnDuration}s
                </span>
              )}
            </button>

            {/* Toggle Voice Recorder or Text Input */}
            {showVoiceRecorder ? (
              <VoiceRecorder
                onAudioRecorded={handleSendVoiceNote}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <>
                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="composer-btn"
                  title="Voice Note"
                >
                  <Mic size={19} />
                </button>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    emitTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendText();
                  }}
                  style={{
                    flex: 1,
                    padding: "13px 18px",
                    borderRadius: "14px",
                    background: "#0a0a0a",
                    border: "1px solid #27272a",
                    color: "white",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />

                <button
                  onClick={handleSendText}
                  style={{
                    padding: "13px 22px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #dc2626, #991b1b)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: "bold",
                    boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                  }}
                >
                  <Send size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a" }}>
          Select a chat to start messaging
        </div>
      )}
    </div>
  );
}

export default Chat;