import { useState, useEffect, lazy, Suspense } from "react";
import { Plus, Clock } from "lucide-react";
import { getStatusesApi } from "../services/api";
import { toast } from "../utils/toast";

const CreateStatusModal = lazy(() => import("./CreateStatusModal"));
const StatusViewerModal = lazy(() => import("./StatusViewerModal"));

const StatusTab = ({ currentUser, socket, ghostMode }) => {
  const [statusGroups, setStatusGroups] = useState([]);
  const [, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState(null);

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const data = await getStatusesApi();
      setStatusGroups(data);
    } catch (err) {
      console.error("Failed to load statuses:", err);
      toast.error("Couldn't load statuses. The server may be waking up — pull to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern; setState runs after await
    loadStatuses();

    if (socket) {
      socket.on("status_posted", loadStatuses);
    }

    return () => {
      if (socket) socket.off("status_posted", loadStatuses);
    };
  }, [socket]);

  // Find current user's status group
  const myStatusGroup = statusGroups.find(
    (g) => String(g.user?._id) === String(currentUser?._id)
  );

  // Other users' statuses split into unviewed (recent) and viewed
  const otherStatusGroups = statusGroups.filter(
    (g) => String(g.user?._id) !== String(currentUser?._id)
  );

  const recentUpdates = otherStatusGroups.filter((g) => g.hasUnviewed);
  const viewedUpdates = otherStatusGroups.filter((g) => !g.hasUnviewed);

  const formatStatusTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));
    if (diffHours <= 0) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    return "Yesterday";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#111113" }}>
      {/* Pulses Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", letterSpacing: "0.3px" }}>
            Pulses
          </span>
          {ghostMode && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                background: "#27272a",
                color: "#fca5a5",
                padding: "2px 7px",
                borderRadius: "10px",
                border: "1px solid #ef4444",
              }}
            >
              👻 GHOST
            </span>
          )}
        </div>
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
          <Plus size={14} /> New Pulse
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* My Pulse Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "12px",
            borderRadius: "14px",
            background: "#161619",
            border: "1px solid #27272a",
            marginBottom: "20px",
            cursor: "pointer",
          }}
          onClick={() => {
            if (myStatusGroup && myStatusGroup.statuses?.length > 0) {
              setSelectedStatusGroup(myStatusGroup);
            } else {
              setCreateModalOpen(true);
            }
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={
                currentUser?.profilePic ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
              }
              alt="My Avatar"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                objectFit: "cover",
                border: myStatusGroup?.statuses?.length > 0 ? "2px solid #ef4444" : "1px solid #3f3f46",
              }}
            />
            <div
              onClick={(e) => {
                e.stopPropagation();
                setCreateModalOpen(true);
              }}
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#dc2626",
                border: "2px solid #111113",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                cursor: "pointer",
              }}
              title="Broadcast new pulse"
            >
              <Plus size={12} />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h4 style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: "600", color: "#ffffff" }}>
              My Pulse
            </h4>
            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
              {myStatusGroup?.statuses?.length > 0
                ? `${myStatusGroup.statuses.length} updates • ${formatStatusTime(myStatusGroup.lastUpdated)}`
                : "Tap to broadcast your pulse"}
            </span>
          </div>
        </div>

        {/* Recent Pulses */}
        {recentUpdates.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#ef4444", fontWeight: "700", letterSpacing: "0.5px", display: "block", marginBottom: "10px" }}>
              Recent Pulses
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentUpdates.map((group) => (
                <div
                  key={group.user?._id}
                  onClick={() => setSelectedStatusGroup(group)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "14px",
                    background: "#161619",
                    border: "1px solid #7f1d1d",
                    boxShadow: "0 0 12px rgba(220, 38, 38, 0.2)",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(3px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
                >
                  {/* Glowing Crimson Circular Ring */}
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      padding: "2px",
                      background: "linear-gradient(135deg, #ef4444, #991b1b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                    }}
                  >
                    <img
                      src={
                        group.user?.profilePic ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                      }
                      alt={group.user?.name}
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #111113",
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                      {group.user?.name || "User"}
                    </h4>
                    <span style={{ fontSize: "12px", color: "#fca5a5" }}>
                      {formatStatusTime(group.lastUpdated)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viewed Updates */}
        {viewedUpdates.length > 0 && (
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#71717a", fontWeight: "700", letterSpacing: "0.5px", display: "block", marginBottom: "10px" }}>
              Viewed Pulses
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {viewedUpdates.map((group) => (
                <div
                  key={group.user?._id}
                  onClick={() => setSelectedStatusGroup(group)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "14px",
                    background: "#141416",
                    border: "1px solid #27272a",
                    cursor: "pointer",
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      padding: "2px",
                      border: "2px solid #3f3f46",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={
                        group.user?.profilePic ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                      }
                      alt={group.user?.name}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "500", color: "#e4e4e7" }}>
                      {group.user?.name || "User"}
                    </h4>
                    <span style={{ fontSize: "12px", color: "#71717a" }}>
                      {formatStatusTime(group.lastUpdated)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentUpdates.length === 0 && viewedUpdates.length === 0 && (
          <div style={{ textAlign: "center", color: "#71717a", marginTop: "40px", padding: "0 20px" }}>
            <Clock size={40} style={{ opacity: 0.25, marginBottom: "10px", color: "#ef4444" }} />
            <h4 style={{ margin: "0 0 4px", color: "#e4e4e7", fontSize: "14px" }}>No recent pulses</h4>
            <p style={{ margin: 0, fontSize: "12px" }}>
              24-hour pulses from your contacts will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Create Status Modal */}
      <Suspense fallback={null}>
        <CreateStatusModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onStatusCreated={() => {
            loadStatuses();
            if (socket) socket.emit("new_status", {});
          }}
        />

        {/* Story Player Modal */}
        <StatusViewerModal
          statusGroup={selectedStatusGroup}
          currentUser={currentUser}
          ghostMode={ghostMode}
          onClose={() => {
            setSelectedStatusGroup(null);
            loadStatuses();
          }}
          onStatusDeleted={() => {
            loadStatuses();
            if (socket) socket.emit("new_status", {});
          }}
        />
      </Suspense>
    </div>
  );
};

export default StatusTab;
