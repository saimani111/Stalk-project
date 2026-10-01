import { useEffect, useState } from "react";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Trash2,
  X,
  Search,
} from "lucide-react";
import { getCallLogsApi, clearCallLogsApi } from "../services/api";

const CallsTab = ({ users, currentUser, onStartCall, onViewAvatar }) => {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCallModalOpen, setNewCallModalOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getCallLogsApi();
      setCallLogs(data);
    } catch (err) {
      console.error("Failed to fetch call logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern; setState runs after await
    loadLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm("Clear all call history?")) return;
    try {
      await clearCallLogsApi();
      setCallLogs([]);
    } catch (err) {
      console.error("Clear call logs failed:", err);
    }
  };

  const formatCallDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today, ${time}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return `Yesterday, ${time}`;

    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#111113" }}>
      {/* Calls Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #27272a",
        }}
      >
        <span style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", letterSpacing: "0.3px" }}>
          Comms Grid
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setNewCallModalOpen(true)}
            style={{
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              border: "none",
              borderRadius: "10px",
              padding: "7px 12px",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              boxShadow: "0 4px 10px rgba(220, 38, 38, 0.4)",
            }}
          >
            <Plus size={14} /> New Comm
          </button>
          {callLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              title="Clear comms history"
              style={{
                background: "#1c1917",
                border: "1px solid #27272a",
                borderRadius: "10px",
                padding: "7px 10px",
                color: "#71717a",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Call History List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {loading ? (
          <p style={{ color: "#71717a", textAlign: "center", marginTop: "30px", fontSize: "14px" }}>
            Loading comms...
          </p>
        ) : callLogs.length === 0 ? (
          <div style={{ textAlign: "center", color: "#71717a", marginTop: "50px", padding: "0 20px" }}>
            <Phone size={44} style={{ opacity: 0.25, marginBottom: "12px", color: "#ef4444" }} />
            <h4 style={{ margin: "0 0 6px", color: "#e4e4e7", fontSize: "15px" }}>No recent comms</h4>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Initiate secure audio or video comms with any contact.
            </p>
          </div>
        ) : (
          callLogs.map((log) => {
            const isCaller = String(log.caller?._id) === String(currentUser?._id);
            const otherUser = isCaller ? log.receiver : log.caller;
            const isMissed = log.status === "missed";
            const isRejected = log.status === "rejected";

            return (
              <div
                key={log._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "#161619",
                  border: "1px solid #27272a",
                  marginBottom: "8px",
                  transition: "background 0.2s",
                }}
              >
                {/* Left: Avatar + Name + Timestamp + Call Direction */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src={
                      otherUser?.profilePic ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                    }
                    alt={otherUser?.name}
                    onClick={() =>
                      onViewAvatar(
                        otherUser?.profilePic ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                      )
                    }
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid #27272a",
                      cursor: "pointer",
                    }}
                    title="Click to view photo"
                  />
                  <div>
                    <h4
                      style={{
                        margin: "0 0 4px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: isMissed ? "#f87171" : "#ffffff",
                      }}
                    >
                      {otherUser?.name || "Unknown User"}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#a1a1aa" }}>
                      {/* Direction Icon */}
                      {isCaller ? (
                        <PhoneOutgoing size={13} style={{ color: "#22c55e" }} />
                      ) : isMissed || isRejected ? (
                        <PhoneMissed size={13} style={{ color: "#ef4444" }} />
                      ) : (
                        <PhoneIncoming size={13} style={{ color: "#22c55e" }} />
                      )}
                      <span>{formatCallDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Call-Back Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => otherUser && onStartCall(otherUser, log.callType || "audio")}
                    style={{
                      background: "#221316",
                      border: "1px solid #7f1d1d",
                      color: "#ef4444",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    title={log.callType === "video" ? "Video Call" : "Audio Call"}
                  >
                    {log.callType === "video" ? <Video size={16} /> : <Phone size={16} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start New Call Modal */}
      {newCallModalOpen && (
        <div
          onClick={() => setNewCallModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 99990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "white", fontWeight: "700" }}>
                Start New Call
              </h3>
              <button
                onClick={() => setNewCallModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#a1a1aa",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "10px",
                padding: "8px 12px",
                marginBottom: "14px",
              }}
            >
              <Search size={15} style={{ color: "#71717a", marginRight: "8px" }} />
              <input
                type="text"
                placeholder="Search contacts to call..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
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

            {/* Contact List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredUsers.length === 0 ? (
                <p style={{ color: "#71717a", textAlign: "center", margin: "20px 0", fontSize: "13px" }}>
                  No contacts found
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: "#161619",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={
                          u.profilePic ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                        }
                        alt={u.name}
                        style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                      />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                        {u.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => {
                          setNewCallModalOpen(false);
                          onStartCall(u, "audio");
                        }}
                        style={{
                          background: "#221316",
                          border: "1px solid #7f1d1d",
                          color: "#ef4444",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Audio Call"
                      >
                        <Phone size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setNewCallModalOpen(false);
                          onStartCall(u, "video");
                        }}
                        style={{
                          background: "#221316",
                          border: "1px solid #7f1d1d",
                          color: "#ef4444",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Video Call"
                      >
                        <Video size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsTab;
