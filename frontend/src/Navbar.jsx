import { Link, NavLink } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useI18n } from "./i18n/context.js";
import { useTheme } from "./theme/context.js";
// Reversed (ivory) version of the NEXTLIB magnifier mark, cropped from nextlib-logo-transparent.png
// so it reads on the navy header without a light backing shape.
import nextlibMarkReverse from "./assets/nextlib-mark-reverse.png";

const TABS = [
  { to: "/", key: "search", end: true },
  { to: "/experience", key: "experience" },
  { to: "/analytics", key: "analytics" },
];

function Navbar() {
  const { t, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const themeLabel = isDark ? t("nav.themeToLight") : t("nav.themeToDark");

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img className="brand-mark-img" src={nextlibMarkReverse} alt="" width="31" height="32" />
        <span className="brand-text">
          <span className="brand-name">{t("nav.brand")}</span>
          <span className="brand-sub" lang="en" dir="ltr">NEXTLIB</span>
        </span>
      </Link>

      <nav className="nav-tabs" aria-label={t("nav.sections")}>
        {TABS.map(({ to, key, end }) => (
          <NavLink
            key={key}
            to={to}
            end={end}
            className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}
          >
            <span className="nav-tab-label">{t(`nav.${key}`)}</span>
            {/* Shorter label for narrow phones; the full one stays the accessible name */}
            {key === "experience" && (
              <span className="nav-tab-label-short" aria-hidden="true">{t("nav.experienceShort")}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="nav-controls">
        <button
          type="button"
          className="nav-control lang-switch"
          onClick={toggleLang}
          title={t("nav.langSwitchLabel")}
          lang={t("nav.langSwitchLang")}
        >
          {t("nav.langSwitch")}
        </button>
        <button
          type="button"
          className="nav-control theme-toggle"
          onClick={toggleTheme}
          title={themeLabel}
          aria-label={themeLabel}
        >
          {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

export default Navbar;
