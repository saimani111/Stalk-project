import { createContext, useContext, useState, useCallback } from "react";
import { translations } from "../i18n/translations";

const STORAGE_KEY = "stalk:lang";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  const setLang = (l) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
