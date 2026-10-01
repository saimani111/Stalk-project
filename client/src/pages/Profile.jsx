import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  uploadFileApi,
  updateProfilePicApi,
  deleteProfilePicApi,
  BASE_URL,
} from "../services/api";
import {
  CHAT_BG_PRESETS,
  getChatBackground,
  setChatBackground,
} from "../utils/chatBackgrounds";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  LogOut,
  Mail,
  Palette,
  Shield,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";

function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgChoice, setBgChoice] = useState(() => getChatBackground(user?._id));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top, #2e0f14 0%, #050505 70%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#a1a1aa" }}>
          Please{" "}
          <Link to="/login" style={{ color: "#ef4444" }}>
            sign in
          </Link>{" "}
          to view your profile.
        </p>
      </div>
    );
  }

  const avatarSrc = user.profilePic
    ? user.profilePic.startsWith("http")
      ? user.profilePic
      : `${BASE_URL}${user.profilePic}`
    : null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setMessage("");
    try {
      setUploading(true);
      const uploaded = await uploadFileApi(file);
      await updateProfilePicApi(uploaded.url);
      setUser({ ...user, profilePic: uploaded.url });
      setMessage("Profile photo updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    setError("");
    setMessage("");
    try {
      await deleteProfilePicApi();
      setUser({ ...user, profilePic: "" });
      setMessage("Profile photo removed");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove photo");
    }
  };

  const chooseChatBg = (value) => {
    setChatBackground(user._id, value);
    setBgChoice(value);
    setError("");
    setMessage("Chat wallpaper updated");
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    try {
      setBgUploading(true);
      const uploaded = await uploadFileApi(file);
      chooseChatBg(uploaded.url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload wallpaper");
    } finally {
      setBgUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #2e0f14 0%, #050505 70%)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#121212",
          border: "1px solid #27272a",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 30px rgba(220, 38, 38, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
          <Link
            to="/chat"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#a1a1aa",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            <ArrowLeft size={16} /> Back to chat
          </Link>
        </div>

        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              position: "relative",
              width: "104px",
              height: "104px",
              margin: "0 auto 16px",
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user.name}
                style={{
                  width: "104px",
                  height: "104px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #dc2626",
                }}
              />
            ) : (
              <div
                style={{
                  width: "104px",
                  height: "104px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444, #991b1b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserIcon size={44} style={{ color: "white" }} />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change photo"
              style={{
                position: "absolute",
                bottom: "0",
                right: "0",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "#dc2626",
                border: "2px solid #121212",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "700" }}>
            {user.name}
          </h2>
          <p style={{ margin: 0, color: "#71717a", fontSize: "13px" }}>
            {uploading ? "Uploading..." : "Tap the camera to change your photo"}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "14px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid #22c55e",
              color: "#86efac",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "14px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {message}
          </div>
        )}

        {/* Info rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#0a0a0a",
              border: "1px solid #27272a",
              borderRadius: "12px",
              padding: "14px 16px",
            }}
          >
            <UserIcon size={18} style={{ color: "#71717a" }} />
            <div>
              <div style={{ fontSize: "12px", color: "#71717a" }}>Name</div>
              <div style={{ fontSize: "14px" }}>{user.name}</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#0a0a0a",
              border: "1px solid #27272a",
              borderRadius: "12px",
              padding: "14px 16px",
            }}
          >
            <Mail size={18} style={{ color: "#71717a" }} />
            <div>
              <div style={{ fontSize: "12px", color: "#71717a" }}>Email</div>
              <div style={{ fontSize: "14px" }}>{user.email}</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#0a0a0a",
              border: "1px solid #27272a",
              borderRadius: "12px",
              padding: "14px 16px",
            }}
          >
            <Shield size={18} style={{ color: "#71717a" }} />
            <div>
              <div style={{ fontSize: "12px", color: "#71717a" }}>Account</div>
              <div style={{ fontSize: "14px" }}>Password protected</div>
            </div>
          </div>
        </div>

        {/* Chat Wallpaper Settings */}
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #27272a",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Palette size={16} style={{ color: "#ef4444" }} />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>Chat Wallpaper</span>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#71717a" }}>
            Choose a background for your chat. Custom photos get a dark veil so messages stay readable.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {CHAT_BG_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => chooseChatBg(preset.id)}
                title={preset.name}
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  background: preset.background,
                  border: bgChoice === preset.id ? "2px solid #ef4444" : "1px solid #27272a",
                  boxShadow: bgChoice === preset.id ? "0 0 10px rgba(239,68,68,.5)" : "none",
                  cursor: "pointer",
                }}
              />
            ))}
            {bgChoice && !CHAT_BG_PRESETS.some((p) => p.id === bgChoice) && (
              <div
                title="Current custom wallpaper"
                style={{ position: "relative", width: "52px", height: "52px" }}
              >
                <img
                  src={bgChoice.startsWith("http") ? bgChoice : `${BASE_URL}${bgChoice}`}
                  alt="Custom wallpaper"
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "12px",
                    objectFit: "cover",
                    border: "2px solid #ef4444",
                  }}
                />
                <button
                  onClick={() => chooseChatBg("default")}
                  title="Remove custom wallpaper"
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#dc2626",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <button
              onClick={() => bgFileInputRef.current?.click()}
              disabled={bgUploading}
              title="Upload your own wallpaper image"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                background: "transparent",
                border: "1px dashed #52525b",
                color: "#a1a1aa",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: bgUploading ? 0.5 : 1,
              }}
            >
              <ImagePlus size={18} />
            </button>
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleBgUpload}
              style={{ display: "none" }}
            />
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#71717a" }}>
            {bgUploading
              ? "Uploading wallpaper..."
              : `Selected: ${
                  CHAT_BG_PRESETS.find((p) => p.id === bgChoice)?.name || "Custom image"
                }`}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          {avatarSrc && (
            <button
              onClick={handleDeletePhoto}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                background: "transparent",
                border: "1px solid #ef4444",
                color: "#ef4444",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Trash2 size={16} /> Remove Photo
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ef4444, #991b1b)",
              border: "none",
              color: "white",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
