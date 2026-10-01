import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "stalk:installDismissed";

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// Chrome/Edge fire beforeinstallprompt; iOS Safari never does — show manual hint instead
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    if (isStandalone() || dismissed) return;
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (isIOS()) setShowIosHint(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [dismissed]);

  const hide = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (dismissed || (!deferred && !showIosHint)) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "linear-gradient(135deg, #dc2626, #991b1b)",
        color: "white",
        borderRadius: 14,
        padding: "10px 12px 10px 16px",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,.5), 0 4px 14px rgba(239,68,68,.4)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <span style={{ maxWidth: 260, lineHeight: 1.4 }}>
        {deferred
          ? "Install Stalk for one-tap access to Stuny"
          : "Safari: tap Share, then \"Add to Home Screen\" to install Stalk"}
      </span>
      {deferred && (
        <button
          onClick={install}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "white",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            color: "#991b1b",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <Download size={14} /> Install
        </button>
      )}
      <button
        onClick={hide}
        aria-label="Dismiss install hint"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,.8)",
          cursor: "pointer",
          display: "flex",
          padding: 4,
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
