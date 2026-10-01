import { useState } from "react";
import { createGroupApi } from "../services/api";
import { Users, X, Check } from "lucide-react";

const CreateGroupModal = ({ isOpen, onClose, users, onGroupCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const newGroup = await createGroupApi({
        name,
        description,
        members: selectedUserIds,
      });

      onGroupCreated(newGroup);
      onClose();
      setName("");
      setDescription("");
      setSelectedUserIds([]);
    } catch (err) {
      console.error("Failed to create group:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="modal-panel"
        style={{
          background: "#121212",
          border: "1px solid #27272a",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 25px rgba(220, 38, 38, 0.2)",
          color: "white",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={22} style={{ color: "#ef4444" }} />
            <h3 style={{ margin: 0, fontSize: "18px" }}>Create Group Chat</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#a1a1aa",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                color: "#fca5a5",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#a1a1aa",
                marginBottom: "6px",
              }}
            >
              Group Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Red Squad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                color: "white",
                outline: "none",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#a1a1aa",
                marginBottom: "6px",
              }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                color: "white",
                outline: "none",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#a1a1aa",
                marginBottom: "8px",
              }}
            >
              Select Members ({selectedUserIds.length} selected)
            </label>
            <div
              style={{
                maxHeight: "160px",
                overflowY: "auto",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "10px",
                padding: "8px",
              }}
            >
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUserSelection(u._id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(220, 38, 38, 0.2)" : "transparent",
                      border: isSelected ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid transparent",
                      transition: "background 0.2s",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={u.profilePic || "https://via.placeholder.com/32"}
                        alt={u.name}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                      />
                      <span style={{ fontSize: "14px", color: "white" }}>{u.name}</span>
                    </div>
                    {isSelected && <Check size={18} style={{ color: "#ef4444" }} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#a1a1aa",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ef4444, #991b1b)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
              }}
            >
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
