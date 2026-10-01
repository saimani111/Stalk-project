import { useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const MessageReactions = ({ messageId, reactions = [], onReact, isMyMessage }) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectEmoji = (emoji) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "4px",
      }}
    >
      {/* Existing Reaction Badges */}
      {Object.keys(groupedReactions).length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          {Object.entries(groupedReactions).map(([emoji, count]) => (
            <span
              key={emoji}
              onClick={() => handleSelectEmoji(emoji)}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid #334155",
                borderRadius: "12px",
                padding: "2px 6px",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                color: "#e2e8f0",
              }}
            >
              <span>{emoji}</span>
              {count > 1 && (
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8" }}>
                  {count}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Trigger Emoji Picker Button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        style={{
          background: "none",
          border: "none",
          color: "#94a3b8",
          cursor: "pointer",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          opacity: 0.7,
        }}
        title="Add reaction"
      >
        <Smile size={14} />
      </button>

      {/* Popover Emoji Picker */}
      {showPicker && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            [isMyMessage ? "right" : "left"]: 0,
            marginBottom: "6px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "20px",
            padding: "6px 10px",
            display: "flex",
            gap: "8px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectEmoji(emoji)}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                padding: "2px",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
