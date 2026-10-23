import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./context.js";

const STORAGE_KEY = "nextlib-theme"; // also read by the inline script in index.html
const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLOR = { light: "#14213d", dark: "#0a0e17" };

const readStoredChoice = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
};

const systemTheme = () =>
  window.matchMedia && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";

// The attribute is applied synchronously (not in an effect) so that anything reading
// CSS variables during the next render, such as the chart colours, already sees the new theme.
const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
};

export default function ThemeProvider({ children }) {
  // null = no manual choice yet → follow the operating system.
  const [choice, setChoice] = useState(readStoredChoice);
  const [system, setSystem] = useState(systemTheme);
  const theme = choice ?? system;

  // Follow live OS changes until the user makes a manual choice.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (e) => {
      const next = e.matches ? "dark" : "light";
      if (readStoredChoice() === null) applyTheme(next);
      setSystem(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: choice lasts for this visit only */
    }
    setChoice(next);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
