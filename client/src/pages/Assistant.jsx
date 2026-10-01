import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { askAssistantApi, speakAssistantApi, getAllUsers, sendApiMessage } from "../services/api";
import { ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Phone, HeartHandshake, X, UserCheck } from "lucide-react";

const WEATHER_OPTIONS = [
  { id: "sunny", label: "☀️ Sunny", line: "Today my mind feels sunny and light." },
  { id: "cloudy", label: "⛅ Cloudy", line: "Today my mind feels a bit cloudy, nothing serious." },
  { id: "rainy", label: "🌧 Rainy", line: "Today my mind feels rainy. I'm a little low." },
  { id: "stormy", label: "⛈ Stormy", line: "Today my mind feels like a storm. It's a lot." },
];

// Crisis keyword detection (English + common transliterations)
const CRISIS_RE =
  /(suicide|suicidal|kill(ing)?\s+myself|want\s+to\s+die|end(ing)?\s+(my\s+life|it\s+all|all\s+of\s+this)|no\s+reason\s+to\s+live|can'?t\s+go\s+on|better\s+off\s+(dead|gone)|not\s+worth\s+living|self.?harm|cut\s+myself|take\s+my\s+(own\s+)?life|marna\s+khud|khudkushi|aatmahatya)/i;

const weatherKey = (uid) => `stuny:weather:${uid || "anon"}`;
const trustedKey = (uid) => `stuny:trusted:${uid || "anon"}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

const MOOD_CHIPS = [
  { label: "I feel stressed", text: "I'm feeling really stressed lately." },
  { label: "Motivate me", text: "I feel like giving up, motivate me." },
  { label: "I feel low", text: "I've been feeling sad and empty." },
  { label: "I can't sleep", text: "My mind won't stop racing, I can't sleep." },
  { label: "Just talk", text: "Hi Stuny, I just want to talk about my day." },
];

const GREETING = {
  role: "assistant",
  content:
    "Hey, I'm Stuny! Come, sit by me — whether your heart is heavy or your mind is racing, we will sort it out together. Life is a long ride and I have been smiling on this road for years. So tell me, how are you feeling right now?",
};

// Stuny = jolly big-bearded motorcycle uncle: prefer deep male voices, Indian English first
const MALE_HINTS = /prabhakar|karun|madhur|hemant|ravinder|male|david|mark|george|daniel|fred|arthur|liam|oliver/i;
const pickVoice = () => {
  const voices = window.speechSynthesis?.getVoices() || [];
  const inMale = voices.filter((v) => /en-IN/i.test(v.lang));
  const anyMale = voices.filter((v) => /^en/i.test(v.lang) && MALE_HINTS.test(v.name));
  return (
    inMale.find((v) => MALE_HINTS.test(v.name)) ||
    anyMale[0] ||
    inMale[0] ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
};

export default function Assistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [todayWeather, setTodayWeather] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(weatherKey(user?._id)) || "null");
      return saved && saved.date === todayStr() ? saved.mood : null;
    } catch {
      return null;
    }
  });
  const [crisis, setCrisis] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [trusted, setTrusted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(trustedKey(user?._id)) || "null");
    } catch {
      return null;
    }
  });
  const [helpSent, setHelpSent] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceOutRef = useRef(voiceOut);
  const cloneUnavailableRef = useRef(false);

  useEffect(() => {
    voiceOutRef.current = voiceOut;
  }, [voiceOut]);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const chooseWeather = (option) => {
    setTodayWeather(option.id);
    localStorage.setItem(weatherKey(user?._id), JSON.stringify({ date: todayStr(), mood: option.id }));
    send(option.line);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort?.();
    };
  }, []);

  const speakViaBrowser = (text) => {
    if (!window.speechSynthesis) return;
    const clean = text.replace(/[*_`#>]/g, "");
    const utter = new SpeechSynthesisUtterance(clean);
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.92;
    utter.pitch = 0.75;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  // Prefer the cloned "best version of me" voice; fall back to browser TTS
  const speak = async (text) => {
    if (!voiceOutRef.current) return;
    window.speechSynthesis?.cancel();
    if (!cloneUnavailableRef.current) {
      try {
        const blob = await speakAssistantApi(text);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onplay = () => setSpeaking(true);
        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          speakViaBrowser(text);
        };
        await audio.play();
        return;
      } catch {
        cloneUnavailableRef.current = true;
      }
    }
    speakViaBrowser(text);
  };

  const send = async (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setError("");
    if (CRISIS_RE.test(text)) {
      setCrisis(true);
      setHelpSent(false);
    }
    const history = [...messages.filter((m) => m !== GREETING || messages.length > 1), { role: "user", content: text }];
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    try {
      const { reply } = await askAssistantApi(history.map((m) => ({ role: m.role, content: m.content })));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (err) {
      const msg = err.response?.data?.message || "Stuny couldn't hear you just now. Try once more?";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input needs Chrome or Edge. You can still type to Stuny.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (const res of e.results) {
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
      if (finalText) {
        setInterim("");
        send(finalText);
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = rec;
    setListening(true);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    rec.start();
  };

  const ringColor = listening ? "#22c55e" : speaking ? "#f59e0b" : busy ? "#8b5cf6" : "#dc2626";

  const openContactPicker = async () => {
    if (contacts) return;
    try {
      const all = await getAllUsers();
      setContacts(all.filter((c) => String(c._id) !== String(user?._id)));
    } catch {
      setError("Could not load your contacts right now.");
    }
  };

  const pickTrusted = (friend) => {
    const t = { id: friend._id, name: friend.name };
    setTrusted(t);
    localStorage.setItem(trustedKey(user?._id), JSON.stringify(t));
  };

  const sendHelpMessage = async () => {
    if (!trusted) return;
    try {
      await sendApiMessage({
        receiver: trusted.id,
        message: "I'm not okay right now and I need someone to talk to. Can you call me? (sent through Stuny)",
      });
      setHelpSent(true);
    } catch {
      setError("Could not send the help message. Please call Tele-MANAS 14416 — free, 24/7.");
    }
  };

  const statusText = listening
    ? "Listening to you…"
    : busy
      ? "Stuny is thinking…"
      : speaking
        ? "Stuny is talking…"
        : "Stuny is here with you";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#09090b", color: "#e4e4e7", fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #1c1c1f", background: "#0f0f12" }}>
        <button onClick={() => navigate("/chat")} style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div
            style={{
              position: "absolute", inset: -4, borderRadius: "50%",
              background: `radial-gradient(circle, ${ringColor}55, transparent 70%)`,
              animation: speaking || listening || busy ? "aria-pulse 1.4s ease-in-out infinite" : "aria-breathe 4s ease-in-out infinite",
            }}
          />
          <img src="/app-icon.png" alt="Stuny avatar" style={{ position: "relative", width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${ringColor}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            Stuny <Sparkles size={14} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 12, color: "#71717a" }}>{statusText}</div>
        </div>
        <button
          onClick={() => {
            setVoiceOut((v) => {
              if (v) window.speechSynthesis?.cancel();
              return !v;
            });
          }}
          title={voiceOut ? "Mute Stuny's voice" : "Unmute Stuny's voice"}
          style={{ background: voiceOut ? "#1c1c1f" : "transparent", border: "1px solid #27272a", borderRadius: 10, width: 40, height: 40, color: voiceOut ? "#f59e0b" : "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {voiceOut ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
            {m.role === "assistant" && (
              <img src="/app-icon.png" alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", opacity: 0.9 }} />
            )}
            <div
              style={{
                maxWidth: "72%",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "#18181b",
                border: m.role === "assistant" ? "1px solid #27272a" : "none",
                fontSize: 14.5,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {interim && <div style={{ alignSelf: "flex-end", fontSize: 13, color: "#22c55e", fontStyle: "italic" }}>{interim}…</div>}
        {busy && (
          <div style={{ display: "flex", gap: 6, padding: "6px 40px" }}>
            {[0, 1, 2].map((d) => (
              <span key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", animation: `aria-dot 1s ease-in-out ${d * 0.2}s infinite` }} />
            ))}
          </div>
        )}
        {error && <div style={{ alignSelf: "center", fontSize: 13, color: "#fca5a5", background: "#7f1d1d33", border: "1px solid #7f1d1d", borderRadius: 10, padding: "8px 12px" }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Daily inner-weather check-in */}
      {!todayWeather && messages.length <= 1 && !busy && (
        <div style={{ margin: "0 16px 8px", background: "#101014", border: "1px solid #27272a", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>What's your inner weather today?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {WEATHER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => chooseWeather(opt)}
                style={{ background: "#18181b", border: "1px solid #27272a", color: "#d4d4d8", borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crisis support card */}
      {crisis && (
        <div style={{ margin: "0 16px 8px", background: "linear-gradient(160deg, #2a0d12, #16060a)", border: "1px solid #ef4444", borderRadius: 16, padding: 16, position: "relative" }}>
          <button
            onClick={() => setCrisis(false)}
            title="Close"
            style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", color: "#71717a", cursor: "pointer", display: "flex" }}
          >
            <X size={16} />
          </button>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, paddingRight: 24 }}>
            <HeartHandshake size={20} color="#f87171" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>You matter. Stuny is staying right here with you.</span>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#d4d4d8", lineHeight: 1.5 }}>
            This kind of pain can change — and you don't have to carry it alone. Real people are available right now, free and confidential:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="tel:14416" style={{ display: "flex", alignItems: "center", gap: 6, background: "#dc2626", color: "white", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Phone size={14} /> Tele-MANAS 14416 (24/7)
            </a>
            <a href="tel:9152987821" style={{ display: "flex", alignItems: "center", gap: 6, background: "#18181b", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: 999, padding: "8px 14px", fontSize: 13, textDecoration: "none" }}>
              <Phone size={14} /> iCall 9152987821
            </a>
          </div>
          <div style={{ marginTop: 14, borderTop: "1px solid #3f1d24", paddingTop: 12 }}>
            {!trusted ? (
              !contacts ? (
                <button
                  onClick={openContactPicker}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid #f59e0b", color: "#fbbf24", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  <UserCheck size={15} /> Choose a trusted friend — Stuny can quietly message them
                </button>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 6 }}>Who should Stuny reach out to?</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 90, overflowY: "auto" }}>
                    {contacts.slice(0, 12).map((f) => (
                      <button
                        key={f._id}
                        onClick={() => pickTrusted(f)}
                        style={{ background: "#18181b", border: "1px solid #27272a", color: "#e4e4e7", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, cursor: "pointer" }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : helpSent ? (
              <div style={{ fontSize: 13, color: "#86efac" }}>
                Help message sent to {trusted.name} — they will see it right away. Stuny is still right here with you.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={sendHelpMessage}
                  style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)", border: "none", color: "white", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Send help message to {trusted.name}
                </button>
                <button
                  onClick={() => {
                    setTrusted(null);
                    setContacts(null);
                    localStorage.removeItem(trustedKey(user?._id));
                  }}
                  style={{ background: "transparent", border: "none", color: "#a1a1aa", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}
                >
                  change friend
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mood chips */}
      {messages.length <= 2 && !busy && (
        <div style={{ display: "flex", gap: 8, padding: "4px 16px 8px", flexWrap: "wrap" }}>
          {MOOD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => send(chip.text)}
              style={{ background: "#18181b", border: "1px solid #27272a", color: "#d4d4d8", borderRadius: 999, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #1c1c1f", background: "#0f0f12" }}>
        <button
          onClick={toggleMic}
          title={listening ? "Stop listening" : "Talk to Stuny"}
          style={{ width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", background: listening ? "#16a34a" : "#1c1c1f", color: listening ? "white" : "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: listening ? "0 0 18px rgba(34,197,94,.6)" : "none" }}
        >
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={listening ? "Listening… just speak" : "Tell Stuny what's on your mind…"}
          style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: 22, padding: "12px 16px", color: "#e4e4e7", fontSize: 14.5, outline: "none" }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || busy}
          style={{ width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", background: input.trim() && !busy ? "linear-gradient(135deg, #dc2626, #991b1b)" : "#1c1c1f", color: input.trim() && !busy ? "white" : "#52525b", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Send size={19} />
        </button>
      </div>

      <style>{`
        @keyframes aria-pulse { 0%,100% { transform: scale(1); opacity: .8 } 50% { transform: scale(1.25); opacity: .35 } }
        @keyframes aria-breathe { 0%,100% { transform: scale(1); opacity: .45 } 50% { transform: scale(1.12); opacity: .8 } }
        @keyframes aria-dot { 0%,100% { transform: translateY(0); opacity: .4 } 50% { transform: translateY(-6px); opacity: 1 } }
      `}</style>
    </div>
  );
}
