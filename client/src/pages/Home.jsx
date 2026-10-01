import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import LangSwitcher from "../components/LangSwitcher";
import InstallPrompt, { InstallButton } from "../components/InstallPrompt";
import { MessageSquare, PhoneCall, Users, Mic, Flame, Sparkles, ArrowRight, HeartHandshake } from "lucide-react";

function Home() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { t } = useLang();
  const user = auth?.user;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, #3b0d16 0%, #0a0a0a 60%)",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px clamp(16px, 4vw, 40px)",
          borderBottom: "1px solid #27272a",
          background: "rgba(13,13,13,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ef4444, #991b1b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
            }}
          >
            <MessageSquare size={22} style={{ color: "white" }} />
          </div>
          <span style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "0.5px", color: "white" }}>Stalk</span>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <LangSwitcher compact />
          {user ? (
            <>
              <button
                onClick={() => navigate("/assistant")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f59e0b, #dc2626)",
                  border: "none",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                }}
              >
                <Sparkles size={16} /> Talk to Stuny
              </button>
              <button
                onClick={() => navigate("/chat")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Chat Workspace <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "transparent",
                  border: "1px solid #27272a",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                {t("login")}
              </button>
              <button
                onClick={() => navigate("/register")}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ef4444, #991b1b)",
                  border: "none",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
                }}
              >
                {t("get_started")}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(40px, 8vh, 80px) 20px 60px" }}>
        {/* Stuny avatar with breathing glow */}
        <div style={{ position: "relative", width: "128px", height: "128px", marginBottom: "28px" }}>
          <div
            style={{
              position: "absolute",
              inset: "-18px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,158,11,0.45), rgba(220,38,38,0.25) 55%, transparent 75%)",
              animation: "stuny-breathe 4s ease-in-out infinite",
            }}
          />
          <img
            src="/hero-art.png"
            alt="Stuny, the AI companion"
            style={{
              position: "relative",
              width: "128px",
              height: "128px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #f59e0b",
              boxShadow: "0 0 40px rgba(245, 158, 11, 0.35)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              right: "-6px",
              background: "linear-gradient(135deg, #f59e0b, #dc2626)",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
            }}
          >
            <Sparkles size={13} /> AI
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.5)",
            color: "#fbbf24",
            padding: "8px 20px",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "24px",
          }}
        >
          <HeartHandshake size={16} /> {t("meet_stuny")}
        </div>

        <h1
          style={{
            fontSize: "clamp(2.1rem, 6vw, 3.6rem)",
            maxWidth: "900px",
            lineHeight: 1.15,
            fontWeight: 800,
            margin: "0 0 24px 0",
          }}
        >
          {t("hero_title_1")}{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #fbbf24, #ef4444)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {t("hero_title_2")}
          </span>
        </h1>

        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", maxWidth: "680px", color: "#a1a1aa", lineHeight: 1.6, margin: "0 0 40px 0" }}>
          {t("hero_desc")}
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => navigate(user ? "/assistant" : "/register")}
            style={{
              padding: "16px 36px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #f59e0b, #dc2626)",
              border: "none",
              color: "white",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Sparkles size={20} /> {t("cta_stuny")} <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate(user ? "/chat" : "/register")}
            style={{
              padding: "16px 30px",
              borderRadius: "14px",
              background: "#141416",
              border: "1px solid #27272a",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Users size={18} /> {t("cta_friends")}
          </button>
        </div>

        <InstallButton />

        {/* Feature Cards Grid */}
        <div
          style={{
            marginTop: "70px",
            display: "grid",
            gap: "24px",
            maxWidth: "1150px",
            width: "100%",
          }}
          className="feature-grid"
        >
          {[
            {
              icon: <Sparkles size={24} color="#fbbf24" />,
              title: "Stuny AI Companion",
              desc: "Talk out loud or type — he understands human feelings, calms you down, motivates you, and answers like the wisest friend you'll ever have.",
              highlight: true,
            },
            { icon: <PhoneCall size={24} color="#ef4444" />, title: "Voice & Video Calls", desc: "Peer-to-peer WebRTC calling with low latency and instant signaling." },
            { icon: <Users size={24} color="#f87171" />, title: "Groups & Communities", desc: "Create groups, join topic hubs, and share statuses with friends." },
            { icon: <Mic size={24} color="#ef4444" />, title: "Voice Notes", desc: "Record audio messages directly in chat with built-in media controls." },
            { icon: <Flame size={24} color="#f87171" />, title: "Burn-After-Reading", desc: "Self-destructing messages that dissolve seconds after being opened." },
          ].map((item, idx) => (
            <div
              key={idx}
              className={item.highlight ? "feature-card--wide" : undefined}
              style={{
                background: item.highlight ? "linear-gradient(160deg, #1c1206 0%, #121212 60%)" : "#121212",
                border: item.highlight ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid #27272a",
                borderRadius: "20px",
                padding: "24px",
                textAlign: "left",
                boxShadow: item.highlight ? "0 8px 30px rgba(245, 158, 11, 0.15)" : "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ marginBottom: "12px" }}>{item.icon}</div>
              <h3 style={{ fontSize: "18px", margin: "0 0 8px 0", color: item.highlight ? "#fbbf24" : "white" }}>{item.title}</h3>
              <p style={{ fontSize: "14px", color: "#a1a1aa", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ marginTop: "50px", fontSize: "13px", color: "#52525b" }}>
          {t("disclaimer")}
        </p>
      </main>

      <InstallPrompt />
    </div>
  );
}

export default Home;
