import { BASE_URL } from "../services/api";

const STORAGE_PREFIX = "stalk:chatBg:";

export const DEFAULT_CHAT_BG =
  "radial-gradient(circle at center, #0f0a0c 0%, #050505 100%)";

export const CHAT_BG_PRESETS = [
  { id: "default", name: "Default", background: DEFAULT_CHAT_BG },
  { id: "crimson", name: "Crimson Glow", background: "radial-gradient(circle at 30% 20%, #2a0a12 0%, #050505 70%)" },
  { id: "midnight", name: "Midnight", background: "linear-gradient(160deg, #0b1023 0%, #050505 60%)" },
  { id: "emerald", name: "Emerald Dusk", background: "radial-gradient(circle at 70% 80%, #06281c 0%, #050505 70%)" },
  { id: "sunset", name: "Sunset Ride", background: "linear-gradient(180deg, #34121e 0%, #1a0b14 45%, #050505 100%)" },
  { id: "emberdots", name: "Ember Dots", background: "radial-gradient(rgba(239,68,68,0.14) 1.2px, transparent 1.2px) 0 0/22px 22px, #08080a" },
];

export const getChatBackground = (userId) =>
  localStorage.getItem(STORAGE_PREFIX + (userId || "anon")) || "default";

export const setChatBackground = (userId, value) =>
  localStorage.setItem(STORAGE_PREFIX + (userId || "anon"), value);

// Returns a style object for the messages stream, or undefined for default
export function buildChatBgStyle(value) {
  if (!value || value === "default") return undefined;
  const preset = CHAT_BG_PRESETS.find((p) => p.id === value);
  if (preset) return { background: preset.background };

  const url = value.startsWith("http") ? value : `${BASE_URL}${value}`;
  return {
    // dark veil keeps bubbles readable over any photo
    backgroundImage: `linear-gradient(rgba(5,5,5,0.82), rgba(5,5,5,0.82)), url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
