import { useMemo, useState } from "react";
import {
  addGroupMembersApi,
  removeGroupMemberApi,
} from "../services/api";
import { Crown, LogOut, UserPlus, X } from "lucide-react";

const GroupInfoModal = ({ isOpen, onClose, group, currentUser, contacts, socket, onGroupUpdated, onSelfLeft }) => {
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isAdmin = useMemo(() => {
    return String(group?.admin?._id || group?.admin || "") === String(currentUser?._id || "");
  }, [group, currentUser]);

  const notInGroup = useMemo(() => {
    const memberIds = new Set((group?.members || []).map((m) => String(m._id || m)));
    return (contacts || []).filter((c) => !memberIds.has(String(c._id)));
  }, [group, contacts]);

  if (!isOpen || !group) return null;

  const groupId = group._id;

  const relayUpdate = (updatedGroup) => {
    onGroupUpdated(updatedGroup);
    socket?.emit("group_updated", { group: updatedGroup });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddMembers = async () => {
    if (!selectedIds.length) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await addGroupMembersApi(groupId, selectedIds);
      relayUpdate(updated);
      setAdding(false);
      setSelectedIds([]);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to add members");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setBusy(true);
    setActionError("");
    try {
      const updated = await removeGroupMemberApi(groupId, memberId);
      if (updated?.deleted) {
        socket?.emit("group_updated", { groupId, deleted: true });
        onSelfLeft(groupId, "Group deleted — no members remain");
        return;
      }
      relayUpdate(updated);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to remove member");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    setActionError("");
    try {
      const updated = await removeGroupMemberApi(groupId, currentUser._id);
      socket?.emit("leave_group", groupId);
      socket?.emit("group_updated", updated?.deleted ? { groupId, deleted: true } : { group: updated });
      onSelfLeft(groupId, "You left the group");
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to leave group");
      setBusy(false);
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
      onClick={onClose}
    >
      <div
        className="modal-panel"
        style={{
          background: "#121212",
          border: "1px solid #27272a",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 25px rgba(220, 38, 38, 0.2)",
          color: "white",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: "17px" }}>Group Info</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 24px" }}>
          {actionError && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                color: "#fca5a5",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              {actionError}
            </div>
          )}

          {/* Group summary */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {group.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "17px", fontWeight: "600" }}>{group.name}</div>
              {group.description && (
                <div style={{ fontSize: "13px", color: "#a1a1aa", marginTop: "2px" }}>{group.description}</div>
              )}
              <div style={{ fontSize: "12px", color: "#71717a", marginTop: "2px" }}>
                {group.members?.length || 0} members
              </div>
            </div>
          </div>

          {/* Add members section */}
          {isAdmin && (
            <div style={{ marginBottom: "18px" }}>
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px dashed rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  <UserPlus size={17} />
                  Add members
                </button>
              ) : (
                <div
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #27272a",
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#a1a1aa", marginBottom: "8px" }}>
                    Add to group ({selectedIds.length} selected)
                  </div>
                  <div style={{ maxHeight: "150px", overflowY: "auto", marginBottom: "10px" }}>
                    {notInGroup.length === 0 ? (
                      <div style={{ fontSize: "13px", color: "#71717a", padding: "6px 2px" }}>
                        All contacts are already in this group
                      </div>
                    ) : (
                      notInGroup.map((c) => (
                        <label
                          key={c._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "7px 6px",
                            cursor: "pointer",
                            borderRadius: "8px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c._id)}
                            onChange={() => toggleSelect(c._id)}
                            style={{ accentColor: "#ef4444" }}
                          />
                          <img
                            src={c.profilePic || "https://via.placeholder.com/28"}
                            alt={c.name}
                            style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }}
                          />
                          <span style={{ fontSize: "14px" }}>{c.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => { setAdding(false); setSelectedIds([]); }}
                      disabled={busy}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        background: "#18181b",
                        border: "1px solid #27272a",
                        color: "#a1a1aa",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMembers}
                      disabled={busy || !selectedIds.length}
                      style={{
                        padding: "7px 16px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #ef4444, #991b1b)",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        opacity: busy || !selectedIds.length ? 0.6 : 1,
                      }}
                    >
                      {busy ? "Adding…" : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members list */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", color: "#a1a1aa", marginBottom: "8px" }}>Members</div>
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {(group.members || []).map((m, idx) => {
                const isSelf = String(m._id) === String(currentUser?._id);
                const isGroupAdmin = String(m._id) === String(group.admin?._id || group.admin);
                const canRemove = isAdmin && !isSelf && !isGroupAdmin;
                return (
                  <div
                    key={m._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderBottom: idx < group.members.length - 1 ? "1px solid #1c1c1f" : "none",
                    }}
                  >
                    <img
                      src={m.profilePic || "https://via.placeholder.com/32"}
                      alt={m.name}
                      style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {m.name}
                        {isSelf && <span style={{ fontSize: "12px", color: "#71717a" }}>(you)</span>}
                      </div>
                      {isGroupAdmin && (
                        <div style={{ fontSize: "11px", color: "#fbbf24", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Crown size={11} /> Admin
                        </div>
                      )}
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(m._id)}
                        disabled={busy}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "8px",
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          color: "#f87171",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave group */}
          <button
            onClick={() => (confirmLeave ? handleLeave() : setConfirmLeave(true))}
            disabled={busy}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "10px",
              background: confirmLeave ? "linear-gradient(135deg, #ef4444, #991b1b)" : "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: confirmLeave ? "700" : "500",
            }}
          >
            <LogOut size={16} />
            {busy ? "Leaving…" : confirmLeave ? "Tap again to confirm leave" : "Leave group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
