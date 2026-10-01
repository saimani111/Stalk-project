import { useRef, useState } from "react";
import { X, Camera, Trash2, Eye, Loader2 } from "lucide-react";
import { uploadFileApi, updateProfilePicApi, deleteProfilePicApi } from "../services/api";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80";

const ProfileModal = ({
  isOpen,
  onClose,
  user,
  onPhotoUpdated,
  onViewPhoto,
}) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const currentPhoto = user?.profilePic || DEFAULT_AVATAR;
  const hasCustomPhoto = Boolean(user?.profilePic);

  // Upload and set new profile picture
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 1. Upload to server
      const uploadRes = await uploadFileApi(file);
      const photoUrl = uploadRes.url;

      // 2. Save profile picture in database
      const updatedUser = await updateProfilePicApi(photoUrl);

      // 3. Callback to parent
      onPhotoUpdated(updatedUser.profilePic);
    } catch (err) {
      console.error("Profile picture upload failed:", err);
      setError("Failed to update photo. Please try again.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // Remove profile picture
  const handleDeletePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;

    try {
      setLoading(true);
      setError("");

      const updatedUser = await deleteProfilePicApi();
      onPhotoUpdated(updatedUser.profilePic || "");
    } catch (err) {
      console.error("Delete profile picture failed:", err);
      setError("Failed to delete photo. Please try again.");
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
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 99990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#111113",
          border: "1px solid #27272a",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(220, 38, 38, 0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#a1a1aa",
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <X size={16} />
        </button>

        <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#ffffff" }}>
          Profile Photo
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#a1a1aa" }}>
          {user?.name || "Your Account"}
        </p>

        {/* Large Avatar Preview with Hover Overlay */}
        <div
          style={{
            position: "relative",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "3px solid #ef4444",
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
            marginBottom: "20px",
            cursor: "pointer",
          }}
          onClick={() => onViewPhoto(currentPhoto)}
          title="Click to maximize photo"
        >
          <img
            src={currentPhoto}
            alt={user?.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "#ef4444",
              }}
            >
              <Loader2 size={32} className="animate-spin" />
              <span style={{ fontSize: "12px", color: "#fff" }}>Updating...</span>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.15)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "16px",
              textAlign: "center",
              width: "100%",
            }}
          >
            {error}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          {/* Maximize Photo Button */}
          <button
            onClick={() => onViewPhoto(currentPhoto)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "11px 16px",
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#ffffff",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Eye size={16} style={{ color: "#ef4444" }} />
            View Full Screen
          </button>

          {/* Change / Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "11px 16px",
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              border: "none",
              color: "#ffffff",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
              transition: "all 0.2s",
            }}
          >
            <Camera size={16} />
            {hasCustomPhoto ? "Change Photo" : "Upload Photo"}
          </button>

          {/* Remove / Delete Button */}
          {hasCustomPhoto && (
            <button
              onClick={handleDeletePhoto}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "11px 16px",
                background: "transparent",
                border: "1px solid #7f1d1d",
                color: "#f87171",
                borderRadius: "12px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              <Trash2 size={16} />
              Remove Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
