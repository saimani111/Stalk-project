import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import LangSwitcher from "../components/LangSwitcher";
import { Lock, Mail, MessageSquare, ArrowRight } from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("fill_fields"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(email, password);
      navigate("/chat");
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
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
          maxWidth: "420px",
          background: "#121212",
          border: "1px solid #27272a",
          borderRadius: "24px",
          padding: "40px 32px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 30px rgba(220, 38, 38, 0.15)",
        }}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
          <LangSwitcher compact />
        </div>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #ef4444, #991b1b)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              boxShadow: "0 10px 20px rgba(239, 68, 68, 0.4)",
            }}
          >
            <MessageSquare size={28} style={{ color: "white" }} />
          </div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700" }}>
            {t("welcome_back")}
          </h2>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: "14px" }}>
            {t("signin_sub")}
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
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submitHandler}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "8px" }}>
              {t("email")}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "12px",
                padding: "0 14px",
              }}
            >
              <Mail size={18} style={{ color: "#71717a", marginRight: "10px" }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  background: "none",
                  border: "none",
                  color: "white",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", color: "#a1a1aa" }}>
                {t("password")}
              </label>
              <Link to="/reset-password" style={{ fontSize: "13px", color: "#ef4444", textDecoration: "none", fontWeight: "600" }}>
                {t("forgot_password")}
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "12px",
                padding: "0 14px",
              }}
            >
              <Lock size={18} style={{ color: "#71717a", marginRight: "10px" }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  background: "none",
                  border: "none",
                  color: "white",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ef4444, #991b1b)",
              border: "none",
              color: "white",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 10px 20px rgba(239, 68, 68, 0.4)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? t("signing_in") : t("sign_in")}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ marginTop: "24px", textAlign: "center", color: "#a1a1aa", fontSize: "14px" }}>
          {t("no_account")}{" "}
          <Link to="/register" style={{ color: "#ef4444", textDecoration: "none", fontWeight: "600" }}>
            {t("register_here")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;