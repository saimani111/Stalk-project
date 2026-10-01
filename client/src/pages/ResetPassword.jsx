import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KeyRound, Lock, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { forgotPasswordApi, resetPasswordApi } from "../services/api";
import { useLang } from "../context/LangContext";
import LangSwitcher from "../components/LangSwitcher";

function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLang();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // The free-tier backend sleeps when idle; a request during wake-up fails with
  // no HTTP response, which reads very differently from a real server rejection.
  const errorMessage = (err, fallback) =>
    err.response?.data?.message ||
    (err.response
      ? fallback
      : "Couldn't reach the server — it may be waking up. Try again in a minute.");

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email) {
      setError(t("fill_fields"));
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await forgotPasswordApi(email);
      setNotice(res.message);
      setStep(2);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!code || !newPassword) {
      setError(t("fill_fields"));
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await resetPasswordApi(email, code, newPassword);
      setNotice(res.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(errorMessage(err, "Invalid code. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const inputBox = {
    display: "flex",
    alignItems: "center",
    background: "#0a0a0a",
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "0 14px",
  };
  const inputStyle = {
    width: "100%",
    padding: "14px 0",
    background: "none",
    border: "none",
    color: "white",
    outline: "none",
    fontSize: "14px",
  };
  const labelStyle = { display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "8px" };
  const btnStyle = {
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
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
          <LangSwitcher compact />
        </div>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
            {step === 1 ? <KeyRound size={28} /> : <ShieldCheck size={28} />}
          </div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: "700" }}>{t("reset_title")}</h2>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: "14px" }}>
            {step === 1 ? t("reset_sub") : notice || t("code_sent")}
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

        {step === 1 ? (
          <form onSubmit={sendCode}>
            <div style={{ marginBottom: "28px" }}>
              <label style={labelStyle}>{t("email")}</label>
              <div style={inputBox}>
                <Mail size={18} style={{ color: "#71717a", marginRight: "10px" }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? t("sending") : t("send_code")}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>{t("code_label")}</label>
              <div style={inputBox}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  style={{ ...inputStyle, letterSpacing: "8px", fontSize: "18px", fontWeight: "700" }}
                />
              </div>
            </div>
            <div style={{ marginBottom: "28px" }}>
              <label style={labelStyle}>{t("new_password")}</label>
              <div style={inputBox}>
                <Lock size={18} style={{ color: "#71717a", marginRight: "10px" }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "..." : t("verify_reset")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
                setNotice("");
              }}
              style={{
                marginTop: "14px",
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "transparent",
                border: "1px solid #27272a",
                color: "#a1a1aa",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <ArrowLeft size={16} /> {t("send_code")} — {email}
            </button>
          </form>
        )}

        <p style={{ marginTop: "24px", textAlign: "center", color: "#a1a1aa", fontSize: "14px" }}>
          <Link to="/login" style={{ color: "#ef4444", textDecoration: "none", fontWeight: "600" }}>
            {t("back_to_login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
