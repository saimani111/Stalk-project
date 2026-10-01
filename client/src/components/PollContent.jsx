import { Check } from "lucide-react";

const PollContent = ({ pollData, currentUserId, onVote }) => {
  if (!pollData || !pollData.options) return null;

  const options = pollData.options;
  const myId = String(currentUserId || "");
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  const myVoteIndex = options.findIndex((opt) =>
    (opt.votes || []).some((v) => String(v?._id || v) === myId)
  );

  return (
    <div style={{ minWidth: "220px", maxWidth: "300px" }}>
      <div
        style={{
          fontWeight: "700",
          fontSize: "14px",
          marginBottom: "10px",
          color: "#f8fafc",
        }}
      >
        {pollData.question}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {options.map((opt, idx) => {
          const votes = opt.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMine = idx === myVoteIndex;

          return (
            <button
              key={idx}
              onClick={() => onVote(idx)}
              title="Tap to vote"
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "rgba(0,0,0,0.35)",
                border: isMine ? "1px solid #ef4444" : "1px solid #3f3f46",
                borderRadius: "8px",
                padding: "8px 10px",
                cursor: "pointer",
                overflow: "hidden",
                color: "#e4e4e7",
                fontSize: "13px",
              }}
            >
              {/* Percentage fill bar */}
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${pct}%`,
                  background: isMine
                    ? "linear-gradient(90deg, rgba(220,38,38,0.55), rgba(220,38,38,0.25))"
                    : "rgba(239,68,68,0.18)",
                  transition: "width 0.3s ease",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: isMine ? "600" : "400" }}>
                  {isMine && <Check size={13} color="#f87171" strokeWidth={3} />}
                  {opt.text}
                </span>
                <span style={{ fontWeight: "700", color: "#fca5a5", fontSize: "12px" }}>
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "11px",
          color: "#a1a1aa",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </span>
        {myVoteIndex >= 0 && <span style={{ color: "#f87171" }}>You voted</span>}
      </div>
    </div>
  );
};

export default PollContent;
