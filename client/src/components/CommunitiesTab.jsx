import { useState, useEffect, lazy, Suspense } from "react";
import {
  Globe,
  Plus,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Send,
  MessageSquare,
} from "lucide-react";
import { getCommunitiesApi, postAnnouncementApi } from "../services/api";

const CreateCommunityModal = lazy(() => import("./CreateCommunityModal"));

const CommunitiesTab = ({ groups, onSelectGroup, socket }) => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedCommunityId, setExpandedCommunityId] = useState(null);
  const [announcementTexts, setAnnouncementTexts] = useState({});

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const data = await getCommunitiesApi();
      setCommunities(data);
      if (data.length > 0 && !expandedCommunityId) {
        setExpandedCommunityId(data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load communities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern; setState runs after await
    loadCommunities();

    if (socket) {
      socket.on("community_created", loadCommunities);
    }

    return () => {
      if (socket) socket.off("community_created", loadCommunities);
    };
  }, [socket]);

  const handlePostAnnouncement = async (communityId) => {
    const text = announcementTexts[communityId];
    if (!text || !text.trim()) return;

    try {
      const updated = await postAnnouncementApi(communityId, text);
      setCommunities((prev) =>
        prev.map((c) => (c._id === communityId ? updated : c))
      );
      setAnnouncementTexts((prev) => ({ ...prev, [communityId]: "" }));
    } catch (err) {
      console.error("Post announcement failed:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#111113" }}>
      {/* Header */}
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
          Networks
        </span>
        <button
          onClick={() => setCreateModalOpen(true)}
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
          <Plus size={14} /> New Network
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {loading ? (
          <p style={{ color: "#71717a", textAlign: "center", marginTop: "30px", fontSize: "14px" }}>
            Loading networks...
          </p>
        ) : communities.length === 0 ? (
          <div style={{ textAlign: "center", color: "#71717a", marginTop: "50px", padding: "0 20px" }}>
            <Globe size={44} style={{ opacity: 0.25, marginBottom: "12px", color: "#ef4444" }} />
            <h4 style={{ margin: "0 0 6px", color: "#e4e4e7", fontSize: "15px" }}>Stay organized with Networks</h4>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Networks unify topic channels and broadcast announcements in one central grid.
            </p>
          </div>
        ) : (
          communities.map((comm) => {
            const isExpanded = expandedCommunityId === comm._id;

            return (
              <div
                key={comm._id}
                style={{
                  background: "#161619",
                  border: "1px solid #27272a",
                  borderRadius: "16px",
                  marginBottom: "14px",
                  overflow: "hidden",
                }}
              >
                {/* Community Header Bar */}
                <div
                  onClick={() => setExpandedCommunityId(isExpanded ? null : comm._id)}
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    background: isExpanded ? "#1c1416" : "transparent",
                    borderBottom: isExpanded ? "1px solid #27272a" : "none",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "18px",
                      }}
                    >
                      {comm.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#ffffff" }}>
                        {comm.name}
                      </h4>
                      <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                        {comm.groups?.length || 0} groups • {comm.members?.length || 1} members
                      </span>
                    </div>
                  </div>

                  <div style={{ color: "#71717a" }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>

                {/* Expanded Details: Announcements & Groups */}
                {isExpanded && (
                  <div style={{ padding: "14px 16px" }}>
                    {/* Description */}
                    {comm.description && (
                      <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#a1a1aa" }}>
                        {comm.description}
                      </p>
                    )}

                    {/* Announcement Feed */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <Megaphone size={14} style={{ color: "#ef4444" }} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#fca5a5", textTransform: "uppercase" }}>
                          Announcements Channel
                        </span>
                      </div>

                      {comm.announcements?.slice(0, 3).map((ann, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#0d0d0f",
                            border: "1px solid #27272a",
                            borderLeft: "3px solid #ef4444",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            marginBottom: "6px",
                            fontSize: "12px",
                            color: "#e4e4e7",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                            <span style={{ fontWeight: "600", color: "#f87171", fontSize: "11px" }}>
                              {ann.author?.name || "Admin"}
                            </span>
                            <span style={{ fontSize: "10px", color: "#71717a" }}>
                              {new Date(ann.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <div>{ann.message}</div>
                        </div>
                      ))}

                      {/* Post Announcement Bar for Creator */}
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                        <input
                          type="text"
                          placeholder="Broadcast an announcement..."
                          value={announcementTexts[comm._id] || ""}
                          onChange={(e) =>
                            setAnnouncementTexts({ ...announcementTexts, [comm._id]: e.target.value })
                          }
                          onKeyDown={(e) => e.key === "Enter" && handlePostAnnouncement(comm._id)}
                          style={{
                            flex: 1,
                            background: "#0a0a0a",
                            border: "1px solid #27272a",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            color: "white",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => handlePostAnnouncement(comm._id)}
                          style={{
                            background: "#dc2626",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0 12px",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Linked Groups */}
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                        Linked Group Chats ({comm.groups?.length || 0})
                      </span>

                      {comm.groups?.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "#71717a" }}>No groups linked yet</span>
                      ) : (
                        comm.groups?.map((g) => (
                          <div
                            key={g._id}
                            onClick={() => onSelectGroup(g)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "9px 12px",
                              borderRadius: "10px",
                              background: "#0d0d0f",
                              border: "1px solid #27272a",
                              marginBottom: "6px",
                              cursor: "pointer",
                              transition: "border 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#27272a")}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <MessageSquare size={15} style={{ color: "#ef4444" }} />
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff" }}>
                                {g.name}
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#71717a" }}>Open Chat</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Suspense fallback={null}>
        <CreateCommunityModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          groups={groups}
          onCommunityCreated={() => {
            loadCommunities();
            if (socket) socket.emit("new_community", {});
          }}
        />
      </Suspense>
    </div>
  );
};

export default CommunitiesTab;
