import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext } from "./context.js";
import en from "./en.json";
import ar from "./ar.json";

const DICTIONARIES = { en, ar };
const STORAGE_KEY = "nextlib-lang"; // also read by the inline script in index.html

const readStoredLang = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
};

const lookup = (dict, key) =>
  key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);

const interpolate = (str, vars) =>
  str.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] ?? `{{${name}}}`));

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", dir);
    document.title = DICTIONARIES[lang].meta.title;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable: choice lasts for this visit only */
    }
  }, [lang, dir]);

  // t("a.b") → string (falls back to English, then to the key itself).
  // t("a.b", { count }) picks a plural form (a.b_zero/_one/_two/_few/_many/_other) using CLDR rules,
  // which Arabic needs (six forms). Non-string values (arrays/objects) are returned as-is.
  const t = useCallback(
    (key, vars = {}) => {
      const dict = DICTIONARIES[lang];
      let value;
      if (typeof vars.count === "number") {
        const form = vars.count === 0 ? "zero" : new Intl.PluralRules(lang).select(vars.count);
        value =
          lookup(dict, `${key}_${form}`) ??
          lookup(dict, `${key}_other`) ??
          lookup(DICTIONARIES.en, `${key}_${vars.count === 1 ? "one" : "other"}`);
      }
      value ??= lookup(dict, key) ?? lookup(DICTIONARIES.en, key);
      if (value === undefined) return key;
      return typeof value === "string" ? interpolate(value, vars) : value;
    },
    [lang]
  );

  const setLang = useCallback((next) => setLangState(next === "ar" ? "ar" : "en"), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === "ar" ? "en" : "ar")), []);

  const value = useMemo(
    () => ({ lang, dir, isRTL: dir === "rtl", t, setLang, toggleLang }),
    [lang, dir, t, setLang, toggleLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
