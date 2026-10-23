import { createContext, useContext } from "react";

export const I18nContext = createContext(null);

// Returns { lang, dir, isRTL, t, setLang, toggleLang }.
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
