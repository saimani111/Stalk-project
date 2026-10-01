import { useState } from "react";
import { X, Globe, Check } from "lucide-react";
import { createCommunityApi } from "../services/api";
import { toast } from "../utils/toast";

const CreateCommunityModal = ({ isOpen, onClose, groups, onCommunityCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleGroup = (id) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((gId) => gId !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const community = await createCommunityApi({
        name,
        description,
        groupIds: selectedGroupIds,
      });

      if (onCommunityCreated) onCommunityCreated(community);
      onClose();
      setName("");
      setDescription("");
      setSelectedGroupIds([]);
    } catch (err) {
      console.error("Create community error:", err);
      toast.error("Failed to create community. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
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
          maxWidth: "460px",
          background: "#111113",
          border: "1px solid #27272a",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Globe size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", color: "white", fontWeight: "700" }}>
              New Community
            </h3>
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
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>
              Community Name
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering Team, Gaming Guild"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "white",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>
              Description
            </label>
            <textarea
              placeholder="Describe this community..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "white",
                fontSize: "13px",
                resize: "none",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>
              Link Existing Groups (Optional)
            </label>
            <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {groups.length === 0 ? (
                <span style={{ fontSize: "12px", color: "#71717a" }}>No groups created yet</span>
              ) : (
                groups.map((g) => {
                  const isSelected = selectedGroupIds.includes(g._id);
                  return (
                    <div
                      key={g._id}
                      onClick={() => toggleGroup(g._id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: isSelected ? "#241417" : "#161619",
                        border: isSelected ? "1px solid #ef4444" : "1px solid #27272a",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "white" }}>{g.name}</span>
                      {isSelected && <Check size={16} style={{ color: "#ef4444" }} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "12px",
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              border: "none",
              color: "white",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
            }}
          >
            {loading ? "Creating..." : "Create Community"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCommunityModal;
