import { Globe } from "lucide-react";
import { useLang } from "../context/LangContext";
import { LANGUAGES } from "../i18n/translations";

export default function LangSwitcher({ compact = false }) {
  const { lang, setLang } = useLang();
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: "#a1a1aa",
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      <Globe size={16} />
      {!compact && <span>Language</span>}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{
          background: "#18181b",
          color: "white",
          border: "1px solid #27272a",
          borderRadius: "8px",
          padding: "6px 8px",
          fontSize: "13px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
