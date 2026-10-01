import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { subscribeToasts } from "../utils/toast";

const TOAST_DURATION = 4000;

const typeStyles = {
  success: { border: "#22c55e", icon: <CheckCircle2 size={18} color="#22c55e" /> },
  error: { border: "#ef4444", icon: <XCircle size={18} color="#ef4444" /> },
  info: { border: "#3b82f6", icon: <Info size={18} color="#3b82f6" /> },
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToasts((entry) => {
      setToasts((prev) => [...prev.slice(-3), { ...entry }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== entry.id));
      }, TOAST_DURATION);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const style = typeStyles[t.type] || typeStyles.info;
        return (
          <div
            key={t.id}
            className="toast-slide-in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#18181b",
              border: `1px solid ${style.border}`,
              borderRadius: "12px",
              padding: "12px 16px",
              color: "white",
              fontSize: "14px",
              minWidth: "240px",
              maxWidth: "360px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
            }}
          >
            {style.icon}
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
