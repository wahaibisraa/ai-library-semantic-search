import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Search,
  GraduationCap,
  Compass,
  UserRound,
  Loader2,
  AlertCircle,
  SearchX,
  Cpu,
  FlaskConical,
  Briefcase,
  Landmark,
  HeartPulse,
  Scale,
  Languages,
  Calculator,
  Palette,
  ShieldCheck,
  Leaf,
  BookMarked,
} from "lucide-react";
import "./App.css";
import Analytics from "./Analytics.jsx";
import Experience from "./Experience.jsx";
import Navbar from "./Navbar.jsx";
import { useI18n } from "./i18n/context.js";

// Display-only: picks a category icon by matching keywords in the subject string.
// It does not affect search, ranking, or any data sent to the backend.
// `key` is the translation key under "categories".
const CATEGORY_RULES = [
  { key: "security", icon: ShieldCheck, re: /secur|cyber|crypt/i },
  { key: "computing", icon: Cpu, re: /comput|software|program|data|artificial|machine learning|network|internet|electronic/i },
  { key: "health", icon: HeartPulse, re: /medic|health|nurs|disease|clinical|anatomy/i },
  { key: "mathematics", icon: Calculator, re: /math|statist|algebra|calculus/i },
  { key: "science", icon: FlaskConical, re: /physic|chemi|biolog|science|engineer|mechanic|machine design|machinery/i },
  { key: "business", icon: Briefcase, re: /manage|business|account|market|econom|financ|advertis/i },
  { key: "law", icon: Scale, re: /law|legal|justice/i },
  { key: "language", icon: Languages, re: /language|linguist|english|arabic|translat|grammar/i },
  { key: "arts", icon: Palette, re: /\barts?\b|music|film|video|paint|graphic design/i },
  { key: "environment", icon: Leaf, re: /environment|ecolog|agricult|climate/i },
  { key: "history", icon: Landmark, re: /histor|cultur|social|politic|geograph/i },
];

const getCategory = (subjects = "") =>
  CATEGORY_RULES.find((c) => c.re.test(subjects)) || { key: "general", icon: BookMarked };

const splitSubjects = (subjects = "") =>
  subjects
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter((s, i, all) => s && all.indexOf(s) === i)
    .slice(0, 4);

// Deterministic cover tint per title, so the same book always gets the same cover.
const COVER_TONES = ["navy", "burgundy", "forest", "slate", "umber"];
const getCoverTone = (title = "") => {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return COVER_TONES[h % COVER_TONES.length];
};

// Unicode bidi isolates: keep a left-to-right value such as "35.0%" intact inside Arabic text
// (otherwise the percent sign is reordered to the wrong side of the number).
const LRI = String.fromCharCode(0x2066);
const PDI = String.fromCharCode(0x2069);

const countResults = (results) =>
  Array.isArray(results)
    ? results.length
    : Object.values(results || {}).reduce((n, books) => n + books.length, 0);

const MODE_OPTIONS = [
  { key: "search", icon: Search },
  { key: "recommend", icon: UserRound },
  { key: "study", icon: GraduationCap },
  { key: "research", icon: Compass },
];

// Example queries are sent to the backend as-is. The catalogue and the mode detection
// are English, so these stay in English in both languages.
const examples = [
  "machine learning",
  "recommend books for ST001",
  "study cybersecurity",
  "research AI ethics",
  "AI in healthcare",
];

// Scroll to the top when the tab changes, as a full page load would.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [manualMode, setManualMode] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState("");

  // Translate a label that comes from the API when we know it; otherwise show it unchanged.
  const tLabel = (key, raw) => {
    const value = t(key);
    return value === key ? raw : value;
  };

  const smartSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const payload = { query };
      if (manualMode) payload.force_mode = manualMode;
      const response = await axios.post("http://127.0.0.1:5000/smart-search", payload);

      setMode(response.data.mode);
      setResults(response.data.results);
      setLastQuery(query);
    } catch (error) {
      console.error(error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = () => {
    if (mode.includes("Recommendation")) return <UserRound />;
    if (mode.includes("Study")) return <GraduationCap />;
    if (mode.includes("Research")) return <Compass />;
    return <Search />;
  };

  const renderBookCard = (book, index) => {
    const category = getCategory(book.subjects);
    const CategoryIcon = category.icon;
    const subjectTags = splitSubjects(book.subjects);

    return (
      <article className="book-card" key={index}>
        <div className={`book-cover tone-${getCoverTone(book.title)}`} aria-hidden="true">
          <CategoryIcon size={22} />
          <span className="book-cover-title" dir="auto">
            {book.title || t("book.untitled")}
          </span>
        </div>

        <div className="book-body">
          <div className="card-top">
            <span className="rank">#{index + 1}</span>
            <span className="category-badge">
              <CategoryIcon size={13} aria-hidden="true" />
              {t(`categories.${category.key}`)}
            </span>
            {book.score !== undefined && (
              <span className="score" title={t("book.scoreTitle")}>
                {t("book.match", { value: `${LRI}${(book.score * 100).toFixed(1)}%${PDI}` })}
              </span>
            )}
          </div>

          <h3 dir="auto">{book.title || t("book.untitled")}</h3>

          <p className="meta">
            <b>{t("book.author")}</b> <bdi>{book.author || t("book.unknown")}</bdi>
          </p>

          <p className="meta">
            <b>{t("book.publisher")}</b> <bdi>{book.publisher || t("book.unknown")}</bdi>
          </p>

          <div className="subjects" aria-label={t("book.subjectsLabel")}>
            {subjectTags.length ? (
              subjectTags.map((s, i) => (
                <span className="subject-tag" key={`${s}-${i}`} dir="auto">
                  {s}
                </span>
              ))
            ) : (
              <span className="subject-empty">{t("book.noSubjects")}</span>
            )}
          </div>

          {book.description && (
            <p className="description" dir="auto">{book.description}</p>
          )}
        </div>
      </article>
    );
  };

  const renderSkeletons = () => (
    <div className="cards" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="book-card skeleton" key={i}>
          <div className="book-cover skeleton-block" />
          <div className="book-body">
            <div className="skeleton-line w-30" />
            <div className="skeleton-line w-90 tall" />
            <div className="skeleton-line w-60" />
            <div className="skeleton-line w-50" />
            <div className="skeleton-line w-80" />
          </div>
        </div>
      ))}
    </div>
  );

  const resultCount = countResults(results);

  const searchPage = (
    <>
      <section className="hero">
        <div className="hero-badge">{t("search.badge")}</div>

        <h1>{t("search.title")}</h1>

        <p>{t("search.lede")}</p>

        <div className="search-panel" role="search">
          <Search className="search-icon" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && smartSearch()}
            placeholder={t("search.placeholder")}
            aria-label={t("search.inputLabel")}
            // Typed text follows its own language (dir="auto"). While empty, dir="auto" would
            // resolve to LTR, so the input inherits the page direction instead and the
            // placeholder reads right-to-left in Arabic.
            dir={query.trim() ? "auto" : undefined}
          />
          <button onClick={smartSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <>
                <Loader2 className="spin" size={18} /> {t("search.searching")}
              </>
            ) : (
              t("search.button")
            )}
          </button>
        </div>

        <div className="search-controls">
          <div className="control-row">
            <span className="control-label" id="mode-label">{t("search.modeLabel")}</span>
            <div className="mode-selector" role="group" aria-labelledby="mode-label">
              {MODE_OPTIONS.map(({ key, icon: Icon }) => {
                const label = t(`modes.${key}`);
                return (
                  <button
                    key={key}
                    className={`mode-btn${manualMode === key ? " active" : ""}`}
                    onClick={() => setManualMode(manualMode === key ? null : key)}
                    title={manualMode === key ? t("search.modeDisable", { mode: label }) : t("search.modeForce", { mode: label })}
                    aria-pressed={manualMode === key}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            <span className="control-hint">
              {manualMode ? t("search.modeHintFixed") : t("search.modeHintAuto")}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">{t("search.tryLabel")}</span>
            <div className="prompt-chips">
              {examples.map((item) => (
                <button key={item} onClick={() => setQuery(item)} lang="en" dir="ltr">
                  {item}
                </button>
              ))}
            </div>
            {t("search.tryHint") && <span className="control-hint">{t("search.tryHint")}</span>}
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {[
          ["semantic", Search],
          ["recommend", UserRound],
          ["study", GraduationCap],
          ["research", Compass],
        ].map(([key, Icon]) => (
          <div className="feature-card" key={key}>
            <Icon aria-hidden="true" />
            <h3>{t(`features.${key}.title`)}</h3>
            <p>{t(`features.${key}.body`)}</p>
          </div>
        ))}
      </section>

      {error && (
        <section className="results-section">
          <div className="state-banner error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>{t("states.errorTitle")}</strong>
              <p>{t("states.errorBody")}</p>
            </div>
            <button className="btn-secondary" onClick={smartSearch} disabled={loading}>
              {t("states.retry")}
            </button>
          </div>
        </section>
      )}

      {loading && !error && (
        <section className="results-section" aria-busy="true">
          <p className="results-status" role="status">{t("states.loading")}</p>
          {renderSkeletons()}
        </section>
      )}

      {mode && !loading && !error && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <span className="mode-badge">
                {getModeIcon()}
                {tLabel(`modeNames.${mode}`, mode)}
              </span>
              <h2>{t("results.heading")}</h2>
              <p className="results-status" role="status">
                {t("results.count", { count: resultCount })}
                {lastQuery && (
                  <>
                    {" "}{t("results.forQuery")} <q dir="auto">{lastQuery}</q>
                  </>
                )}
              </p>
            </div>
          </div>

          {resultCount === 0 ? (
            <div className="empty-state">
              <SearchX size={36} aria-hidden="true" />
              <h3>{t("states.emptyTitle")}</h3>
              <p>{t("states.emptyBody")}</p>
            </div>
          ) : mode === "Research Mode" ? (
            <div className="roadmap">
              {Object.entries(results || {}).map(([step, books], stepIndex) => (
                <div className="roadmap-step" key={step}>
                  <div className="step-number">{stepIndex + 1}</div>
                  <div className="step-content">
                    <h3>{tLabel(`roadmapSteps.${step}`, step)}</h3>
                    <div className="cards">
                      {books.map((book, index) => renderBookCard(book, index))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cards">
              {(results || []).map((book, index) => renderBookCard(book, index))}
            </div>
          )}
        </section>
      )}
    </>
  );

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">{t("nav.skip")}</a>
      <ScrollToTop />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={searchPage} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
