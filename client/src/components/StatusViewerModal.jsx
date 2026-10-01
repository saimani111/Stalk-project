import { useState, useEffect, useRef, useCallback } from "react";
import { X, Eye, Trash2 } from "lucide-react";
import { viewStatusApi, deleteStatusApi } from "../services/api";

const STORY_DURATION_MS = 5000;

const StatusViewerModal = ({
  statusGroup, // { user, statuses: [] }
  currentUser,
  ghostMode = false,
  onClose,
  onStatusDeleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const progressIntervalRef = useRef(null);

  const currentStory = statusGroup?.statuses?.[currentIndex];
  const isOwnStory = String(statusGroup?.user?._id) === String(currentUser?._id);

  const handleNext = useCallback(() => {
    const total = statusGroup?.statuses?.length || 0;
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, statusGroup, onClose]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Mark status as viewed if other user's story (skipped in Ghost Mode!)
  useEffect(() => {
    if (currentStory && !isOwnStory && !ghostMode) {
      viewStatusApi(currentStory._id).catch(() => {});
    }
  }, [currentIndex, currentStory, isOwnStory, ghostMode]);

  // Story Timer
  useEffect(() => {
    if (!statusGroup?.statuses?.length) return undefined;
    const stepTime = 50;
    const increment = (stepTime / STORY_DURATION_MS) * 100;
    let ticks = 0;

    progressIntervalRef.current = setInterval(() => {
      ticks += 1;
      const next = ticks * increment;
      if (next >= 100) {
        clearInterval(progressIntervalRef.current);
        setProgress(100);
        handleNext();
      } else {
        setProgress(next);
      }
    }, stepTime);

    return () => clearInterval(progressIntervalRef.current);
  }, [currentIndex, statusGroup, handleNext]);

  if (!statusGroup || !statusGroup.statuses || statusGroup.statuses.length === 0) return null;

  const handleDelete = async () => {
    if (!window.confirm("Delete this status update?")) return;
    try {
      await deleteStatusApi(currentStory._id);
      if (onStatusDeleted) onStatusDeleted(currentStory._id);
      if (statusGroup.statuses.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error("Delete status failed:", err);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(12px)",
        zIndex: 99995,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          height: "90vh",
          maxHeight: "750px",
          background: currentStory?.backgroundColor || "#121214",
          borderRadius: "20px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(220, 38, 38, 0.3)",
        }}
      >
        {/* Progress Bars for Multi-Part Statuses */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            right: "14px",
            display: "flex",
            gap: "5px",
            zIndex: 20,
          }}
        >
          {statusGroup.statuses.map((_, idx) => {
            const barProgress =
              idx < currentIndex ? 100 : idx === currentIndex ? progress : 0;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: "3px",
                  background: "rgba(255, 255, 255, 0.3)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barProgress}%`,
                    background: "#ffffff",
                    transition: "width 0.05s linear",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header (Author + Timestamp + Close) */}
        <div
          style={{
            position: "absolute",
            top: "26px",
            left: "16px",
            right: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={
                statusGroup.user?.profilePic ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
              }
              alt={statusGroup.user?.name}
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid #ef4444" }}
            />
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", color: "white", fontWeight: "700" }}>
                {statusGroup.user?.name || "User"}
              </h4>
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)" }}>
                {new Date(currentStory?.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {ghostMode && !isOwnStory && (
              <span
                style={{
                  background: "rgba(0, 0, 0, 0.75)",
                  border: "1px solid #ef4444",
                  color: "#fca5a5",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 9px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
                }}
              >
                👻 Ghost Active
              </span>
            )}
            {isOwnStory && (
              <button
                onClick={handleDelete}
                title="Delete this status"
                style={{
                  background: "rgba(0, 0, 0, 0.5)",
                  border: "none",
                  borderRadius: "50%",
                  color: "#f87171",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(0, 0, 0, 0.5)",
                border: "none",
                borderRadius: "50%",
                color: "white",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Story Body */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Left / Right Click Navigators */}
          <div
            onClick={handlePrev}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "35%",
              zIndex: 10,
              cursor: "pointer",
            }}
          />
          <div
            onClick={handleNext}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: "35%",
              zIndex: 10,
              cursor: "pointer",
            }}
          />

          {/* Media or Text Content */}
          {currentStory?.mediaUrl ? (
            <img
              src={currentStory.mediaUrl}
              alt="Status"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "#000000",
              }}
            />
          ) : (
            <div
              style={{
                padding: "40px 24px",
                color: "white",
                fontSize: "22px",
                fontWeight: "600",
                textAlign: "center",
                lineHeight: "1.4",
                wordBreak: "break-word",
              }}
            >
              {currentStory?.caption}
            </div>
          )}
        </div>

        {/* Caption Overlay */}
        {currentStory?.mediaUrl && currentStory?.caption && (
          <div
            style={{
              position: "absolute",
              bottom: isOwnStory ? "50px" : "20px",
              left: "16px",
              right: "16px",
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(6px)",
              padding: "10px 14px",
              borderRadius: "12px",
              color: "white",
              fontSize: "14px",
              textAlign: "center",
              zIndex: 15,
            }}
          >
            {currentStory.caption}
          </div>
        )}

        {/* Viewers bar for own story */}
        {isOwnStory && (
          <div
            onClick={() => setShowViewers((prev) => !prev)}
            style={{
              padding: "12px 16px",
              background: "rgba(0, 0, 0, 0.8)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#d4d4d8",
              fontSize: "13px",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <Eye size={16} style={{ color: "#ef4444" }} />
            <span>{currentStory?.viewers?.length || 0} views</span>
          </div>
        )}

        {/* Viewers Drawer */}
        {showViewers && (
          <div
            style={{
              position: "absolute",
              bottom: "45px",
              left: 0,
              right: 0,
              maxHeight: "200px",
              background: "#18181b",
              borderTop: "1px solid #27272a",
              overflowY: "auto",
              padding: "12px",
              zIndex: 25,
            }}
          >
            <h5 style={{ margin: "0 0 8px", color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase" }}>
              Viewed by ({currentStory?.viewers?.length || 0})
            </h5>
            {currentStory?.viewers?.length === 0 ? (
              <span style={{ fontSize: "12px", color: "#71717a" }}>No viewers yet</span>
            ) : (
              currentStory?.viewers?.map((v) => (
                <div key={v._id || v} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <img
                    src={v.profilePic || "https://via.placeholder.com/24"}
                    alt={v.name}
                    style={{ width: "24px", height: "24px", borderRadius: "50%" }}
                  />
                  <span style={{ fontSize: "13px", color: "white" }}>{v.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusViewerModal;
