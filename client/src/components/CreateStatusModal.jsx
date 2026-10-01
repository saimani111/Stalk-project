import { useState, useRef } from "react";
import { X, Image, Type, Send, Loader2 } from "lucide-react";
import { uploadFileApi, createStatusApi } from "../services/api";
import { toast } from "../utils/toast";

const PRESET_COLORS = [
  "#dc2626", // Crimson Red
  "#7f1d1d", // Dark Crimson
  "#991b1b", // Deep Red
  "#4c0519", // Rose Black
  "#18181b", // Obsidian Zinc
  "#09090b", // Pure Dark
];

const CreateStatusModal = ({ isOpen, onClose, onStatusCreated }) => {
  const [activeTab, setActiveTab] = useState("text"); // "text" | "photo"
  const [textCaption, setTextCaption] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    try {
      setLoading(true);
      let mediaUrl = "";

      if (activeTab === "photo" && imageFile) {
        const uploadRes = await uploadFileApi(imageFile);
        mediaUrl = uploadRes.url;
      }

      if (activeTab === "text" && !textCaption.trim()) {
        toast.error("Please enter some text for your status update.");
        setLoading(false);
        return;
      }

      const statusPayload = {
        mediaUrl,
        caption: textCaption,
        backgroundColor: selectedColor,
      };

      const created = await createStatusApi(statusPayload);
      if (onStatusCreated) onStatusCreated(created);
      onClose();
    } catch (err) {
      console.error("Create status error:", err);
      toast.error("Failed to post status. Please try again.");
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
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
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
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("text")}
              style={{
                background: activeTab === "text" ? "#dc2626" : "transparent",
                border: "1px solid #27272a",
                color: "white",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Type size={14} /> Text
            </button>
            <button
              onClick={() => setActiveTab("photo")}
              style={{
                background: activeTab === "photo" ? "#dc2626" : "transparent",
                border: "1px solid #27272a",
                color: "white",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Image size={14} /> Photo
            </button>
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

        {/* Content Preview Canvas */}
        <div
          style={{
            height: "260px",
            background: activeTab === "text" ? selectedColor : "#050505",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            position: "relative",
            transition: "background 0.3s",
          }}
        >
          {activeTab === "text" ? (
            <textarea
              placeholder="Type a status update..."
              value={textCaption}
              onChange={(e) => setTextCaption(e.target.value)}
              maxLength={200}
              autoFocus
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: "20px",
                fontWeight: "600",
                textAlign: "center",
                resize: "none",
                outline: "none",
                display: "flex",
                alignItems: "center",
              }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: "10px" }}
                />
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#1c1917",
                    border: "1px dashed #ef4444",
                    color: "#fca5a5",
                    padding: "20px 24px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Image size={32} />
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>Choose a Photo</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Color Palette or Caption for Photo */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #27272a", background: "#161619" }}>
          {activeTab === "text" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Background:</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {PRESET_COLORS.map((col) => (
                  <div
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: col,
                      cursor: "pointer",
                      border: selectedColor === col ? "2px solid #ffffff" : "1px solid #3f3f46",
                      transform: selectedColor === col ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Add a caption..."
                value={textCaption}
                onChange={(e) => setTextCaption(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0a0a0a",
                  border: "1px solid #27272a",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "white",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: "none" }}
        />

        {/* Footer / Post Button */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #27272a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "#71717a" }}>
            Disappears after 24 hours
          </span>
          <button
            onClick={handlePost}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              border: "none",
              color: "white",
              padding: "10px 20px",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Post Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStatusModal;
