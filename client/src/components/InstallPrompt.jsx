import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "stalk:installDismissed";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// Chrome/Edge fire beforeinstallprompt (captured early in main.jsx);
// iOS Safari and in-app browsers never do — show manual hints instead.

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    if (isStandalone() || dismissed) return;
    const take = () => {
      if (window.__stalkBip) setDeferred(window.__stalkBip);
    };
    take();
    window.addEventListener("stalk-install-available", take);
    if (isIOS()) setShowIosHint(true);
    return () => window.removeEventListener("stalk-install-available", take);
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
    window.__stalkBip = null;
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

// Visible "Install App" button for the landing page: one-tap when Chrome
// allows it, step-by-step instructions otherwise (iOS / in-app browsers).
export function InstallButton() {
  const [canPrompt, setCanPrompt] = useState(() => !!window.__stalkBip);
  const [installed, setInstalled] = useState(isStandalone);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const onAvailable = () => setCanPrompt(true);
    const onInstalled = () => {
      setInstalled(true);
      window.__stalkBip = null;
    };
    window.addEventListener("stalk-install-available", onAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("stalk-install-available", onAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const click = async () => {
    const ev = window.__stalkBip;
    if (ev) {
      ev.prompt();
      await ev.userChoice;
      window.__stalkBip = null;
      setCanPrompt(false);
      return;
    }
    setShowSteps((v) => !v);
  };

  return (
    <div style={{ marginTop: "22px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <button
        onClick={click}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 22px",
          borderRadius: "999px",
          background: "transparent",
          border: "1px solid #3f3f46",
          color: "#a1a1aa",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Download size={15} /> {canPrompt ? "Install Stalk App" : "How to install on your phone"}
      </button>
      {showSteps && (
        <p style={{ maxWidth: "420px", margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#71717a" }}>
          {isIOS()
            ? "Open this page in Safari → tap the Share button → \"Add to Home Screen\" → Add."
            : "Open this page in Chrome (not WhatsApp's browser — tap ⋮ at the top right, then \"Open in browser\") → tap the ⋮ menu → \"Add to Home screen\" / \"Install app\"."}
        </p>
      )}
    </div>
  );
}
