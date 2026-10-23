import { useState } from "react";
import axios from "axios";
import {
  Search,
  Sparkles,
  GraduationCap,
  Compass,
  UserRound,
  Loader2,
  Star,
  BarChart2,
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
import nextlibLogoTransparent from "./assets/nextlib-logo-transparent.png";
import researchPaperFirstPage from "./assets/research-paper-first-page.png";

// Display-only: picks a category icon by matching keywords in the subject string.
// It does not affect search, ranking, or any data sent to the backend.
const CATEGORY_RULES = [
  { label: "Security", icon: ShieldCheck, re: /secur|cyber|crypt/i },
  { label: "Computing", icon: Cpu, re: /comput|software|program|data|artificial|machine learning|network|internet|electronic/i },
  { label: "Health", icon: HeartPulse, re: /medic|health|nurs|disease|clinical|anatomy/i },
  { label: "Mathematics", icon: Calculator, re: /math|statist|algebra|calculus/i },
  { label: "Science", icon: FlaskConical, re: /physic|chemi|biolog|science|engineer|mechanic|machine design|machinery/i },
  { label: "Business", icon: Briefcase, re: /manage|business|account|market|econom|financ|advertis/i },
  { label: "Law", icon: Scale, re: /law|legal|justice/i },
  { label: "Language", icon: Languages, re: /language|linguist|english|arabic|translat|grammar/i },
  { label: "Arts", icon: Palette, re: /\barts?\b|music|film|video|paint|graphic design/i },
  { label: "Environment", icon: Leaf, re: /environment|ecolog|agricult|climate/i },
  { label: "History & Society", icon: Landmark, re: /histor|cultur|social|politic|geograph/i },
];

const getCategory = (subjects = "") =>
  CATEGORY_RULES.find((c) => c.re.test(subjects)) || { label: "General", icon: BookMarked };

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

const countResults = (results) =>
  Array.isArray(results)
    ? results.length
    : Object.values(results || {}).reduce((n, books) => n + books.length, 0);

const MODE_OPTIONS = [
  { key: "search", label: "Search", icon: Search },
  { key: "recommend", label: "Recommend", icon: UserRound },
  { key: "study", label: "Study", icon: GraduationCap },
  { key: "research", label: "Research", icon: Compass },
];

const interviewRows = [
  ["College of Shari'a Sciences", "Academic", "Manual", "Basic OPAC", "No system", "Barcode"],
  ["Sultan Qaboos Grand Mosque", "Public", "Semi-automated", "Basic OPAC", "No system", "N/A"],
  ["MCBS", "Academic", "Manual", "Basic OPAC", "No system", "Manual"],
  ["National University, Bausher", "Academic", "Semi-automated", "Basic OPAC", "No system", "Barcode"],
  ["College of Banking & Financial Studies", "Academic", "Semi-automated", "Basic OPAC", "No system", "RFID"],
  ["Public Knowledge Library", "Public", "Semi-automated", "Basic OPAC", "Rule-based", "N/A"],
  ["Majan University College", "Academic", "Manual", "Basic OPAC", "No system", "RFID"],
  ["German University of Technology", "Academic", "Mixed", "OPAC / Discovery / AI", "Manual lists", "Manual / RFID"],
  ["Sultan Qaboos University", "Academic", "Semi-automated", "Basic OPAC", "Manual lists", "RFID"],
  ["Military Technological College", "Academic", "Fully automated", "Basic OPAC", "Manual lists", "Manual"],
  ["UTAS, Muscat", "Academic", "Manual", "Basic OPAC", "No system", "Manual"],
];

const surveyCharts = {
  frustrations: [
    ["Hard to tell if a book covers the topic", 302, "45.3%"],
    ["Exact titles / keywords feel outdated", 276, "41.4%"],
    ["Resources are outdated or unavailable", 197, "29.6%"],
    ["Finding the physical book takes too long", 194, "29.1%"],
  ],
  discovery: [
    ["AI assistants", 392, "58.9%"],
    ["Standard search engines", 303, "45.5%"],
    ["University library portal", 159, "23.9%"],
    ["Professor or peer", 112, "16.8%"],
  ],
  behavior: [
    ["Yes, occasionally", 263, "39.5%"],
    ["Yes, frequently", 205, "30.8%"],
    ["No, eventually find it", 109, "16.4%"],
    ["Rarely use library search", 89, "13.4%"],
  ],
  intent: [
    ["Use the library significantly more", 238, "35.7%"],
    ["Save hours per semester", 193, "29.0%"],
    ["Discover beyond my major", 159, "23.9%"],
    ["No change", 76, "11.4%"],
  ],
};

function App() {
  const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
  const [page, setPage] = useState("home");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [manualMode, setManualMode] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState("");

  const examples = [
    "machine learning",
    "recommend books for ST001",
    "study cybersecurity",
    "research AI ethics",
    "AI in healthcare",
  ];

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
      setError("Could not reach the library server. Make sure the Flask backend is running on port 5000, then try again.");
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
            {book.title || "Untitled Book"}
          </span>
        </div>

        <div className="book-body">
          <div className="card-top">
            <span className="rank">#{index + 1}</span>
            <span className="category-badge">
              <CategoryIcon size={13} aria-hidden="true" />
              {category.label}
            </span>
            {book.score !== undefined && (
              <span className="score" title="Relevance score for this query">
                <Star size={13} aria-hidden="true" />
                {(book.score * 100).toFixed(1)}% match
              </span>
            )}
          </div>

          <h3 dir="auto">{book.title || "Untitled Book"}</h3>

          <p className="meta" dir="auto">
            <b>Author:</b> {book.author || "Unknown"}
          </p>

          <p className="meta" dir="auto">
            <b>Publisher:</b> {book.publisher || "Unknown"}
          </p>

          <div className="subjects" aria-label="Subjects">
            {subjectTags.length ? (
              subjectTags.map((s, i) => (
                <span className="subject-tag" key={`${s}-${i}`} dir="auto">
                  {s}
                </span>
              ))
            ) : (
              <span className="subject-empty">No subjects available</span>
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

  const renderNavbar = () => (
    <nav className="navbar">
      <div className="brand">
        <img className="brand-logo-small" src={nextlibLogoTransparent} alt="" />
        <span>Smart AI Library</span>
      </div>

      <div className="nav-tabs" role="tablist" aria-label="Main sections">
        <button
          className={`nav-tab${page === "home" ? " active" : ""}`}
          onClick={() => setPage("home")}
          role="tab"
          aria-selected={page === "home"}
        >
          <Search size={15} />
          Search
        </button>
        <button
          className={`nav-tab${page === "analytics" ? " active" : ""}`}
          onClick={() => setPage("analytics")}
          role="tab"
          aria-selected={page === "analytics"}
        >
          <BarChart2 size={15} />
          Analytics
        </button>
      </div>
    </nav>
  );

  return (
    <div className={`app ${demoMode ? "demo-mode" : "presentation-mode"}`}>
      {page === "analytics" ? (
        <>
          {renderNavbar()}
          <Analytics />
        </>
      ) : (
        <>
        <main className="story">
        <section className="story-hero">
          <div className="story-hero-copy">
            <span className="eyebrow">A research-led library experience</span>
            <h1>Students are searching everywhere except the library.</h1>
            <p className="story-lede">NEXTLIB turns natural questions into relevant academic books, helping students move from scattered searching to confident discovery.</p>
          </div>
          <div className="story-hero-mark"><img src={nextlibLogoTransparent} alt="NEXTLIB logo" /></div>
        </section>

        <section className="problem-section" id="problem">
          <div className="section-heading compact-heading"><span className="eyebrow">The problem</span><h2>Library search has not caught up with student behavior.</h2><p>Interviews across Omani libraries and a 666-response student survey point to the same gap: students need more context, better discovery, and less friction.</p></div>
          <div className="problem-points">
            <div><strong>01</strong><h3>Keyword systems are too rigid</h3><p>Most interviewed libraries still rely on basic OPAC keyword search.</p></div>
            <div><strong>02</strong><h3>Discovery is happening elsewhere</h3><p>Students increasingly turn to AI assistants and general search engines first.</p></div>
            <div><strong>03</strong><h3>Facilities do not support discovery</h3><p>Without digital guidance, the library becomes a place to sit rather than a place to find.</p></div>
          </div>
        </section>

        <section className="evidence-section" id="evidence">
          <div className="section-heading"><span className="eyebrow">Field interviews</span><h2>11 libraries. One clear pattern.</h2><p>The interviews show a landscape that is partly digital, but still dominated by manual work, basic OPAC search, and limited recommendation support.</p></div>
          <div className="interview-table-wrap">
            <table className="interview-table"><thead><tr><th>Library</th><th>Type</th><th>Cataloging</th><th>Search</th><th>Recommendations</th><th>Handling</th></tr></thead><tbody>{interviewRows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={`${row[0]}-${i}`}>{cell}</td>)}</tr>)}</tbody></table>
          </div>
          <p className="table-note">Summary of the interview matrix. The full findings cover cataloging, retrieval, assistance, recommendations, collection development, handling, analytics, and preservation.</p>
        </section>

        <section className="survey-section" id="survey">
          <div className="section-heading"><span className="eyebrow">Student survey</span><h2>The evidence is not subtle.</h2><p>Across 666 responses, students describe a search experience that is hard to trust and easy to abandon.</p></div>
          <div className="stat-strip"><div><strong>666</strong><span>responses</span></div><div><strong>70.3%</strong><span>abandoned a search at least occasionally</span></div><div><strong>88.6%</strong><span>would benefit from conversational discovery</span></div></div>
          <div className="chart-grid">
            <SurveyChart title="What gets in the way?" note="Select all that apply" data={surveyCharts.frustrations} max={302} />
            <SurveyChart title="Where do students search first?" note="Select all that apply" data={surveyCharts.discovery} max={392} />
            <SurveyChart title="Have students abandoned a search?" data={surveyCharts.behavior} max={263} />
            <SurveyChart title="What would conversational search change?" data={surveyCharts.intent} max={238} />
          </div>
        </section>

        <section className="research-section" id="research">
          <div className="research-copy"><span className="eyebrow">Research to prototype</span><h2>Built as research. Presented as a working system.</h2><p>We developed the idea as a research paper on NLP-based resource discovery for academic libraries. The work was accepted for conference presentation and is planned for publication in IEEE and indexing in Scopus.</p><div className="research-meta"><span>Conference paper</span><span>NLP + semantic search</span><span>Academic library discovery</span></div></div>
          <div className="paper-frame"><img src={researchPaperFirstPage} alt="First page of the NEXTLIB research paper" /></div>
          <div className="presentation-placeholder"><div className="placeholder-icon">+</div><strong>Presentation evidence</strong><span>Add the presentation photo here</span></div>
        </section>

        <section className="demo-slide">
          <span className="eyebrow">The working solution</span>
          <h2>Ready to see NEXTLIB in action?</h2>
          <p>Open the live demo and try a natural-language search across the academic catalogue.</p>
          <a className="demo-slide-link" href="?demo=1" target="_blank" rel="noreferrer">TEST THE DEMO <span>↗</span></a>
        </section>
        </main>
        <section className="hero">
        {renderNavbar()}
        <div id="product" className="product-anchor" aria-hidden="true" />
        <div className="product-kicker"><img src={nextlibLogoTransparent} alt="" /> <span>Now try the solution</span></div>
        <div className="hero-badge">
          <Sparkles size={18} />
          AI-Powered Academic Assistant
        </div>

        <h1>One Search. Multiple Academic Supports.</h1>

        <p>
          Search books, get personalized recommendations, prepare for courses,
          and generate research roadmaps using one intelligent library assistant.
        </p>

        <div className="search-panel" role="search">
          <Search className="search-icon" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && smartSearch()}
            placeholder="Search by topic, course, or student ID…"
            aria-label="Search the library catalogue"
            dir="auto"
          />
          <button onClick={smartSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <>
                <Loader2 className="spin" size={18} /> Searching
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>

        <div className="search-controls">
          <div className="control-row">
            <span className="control-label" id="mode-label">Mode</span>
            <div className="mode-selector" role="group" aria-labelledby="mode-label">
              {MODE_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`mode-btn${manualMode === key ? " active" : ""}`}
                  onClick={() => setManualMode(manualMode === key ? null : key)}
                  title={manualMode === key ? `Click to disable ${label} override` : `Force ${label} mode`}
                  aria-pressed={manualMode === key}
                >
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <span className="control-hint">
              {manualMode ? "Mode fixed — click again to return to auto-detect" : "Auto-detected from your query"}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Try</span>
            <div className="prompt-chips">
              {examples.map((item) => (
                <button key={item} onClick={() => setQuery(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <Search />
          <h3>Semantic Search</h3>
          <p>Find relevant books using natural language queries.</p>
        </div>

        <div className="feature-card">
          <UserRound />
          <h3>Recommendations</h3>
          <p>Suggest books based on student profile and interests.</p>
        </div>

        <div className="feature-card">
          <GraduationCap />
          <h3>Study Mode</h3>
          <p>Recommend beginner-friendly and useful course resources.</p>
        </div>

        <div className="feature-card">
          <Compass />
          <h3>Research Mode</h3>
          <p>Create a step-by-step reading roadmap for research topics.</p>
        </div>
      </section>

      {error && (
        <section className="results-section">
          <div className="state-banner error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Search failed</strong>
              <p>{error}</p>
            </div>
            <button className="btn-secondary" onClick={smartSearch} disabled={loading}>
              Try again
            </button>
          </div>
        </section>
      )}

      {loading && !error && (
        <section className="results-section" aria-busy="true">
          <p className="results-status" role="status">Searching the catalogue…</p>
          {renderSkeletons()}
        </section>
      )}

      {mode && !loading && !error && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <span className="mode-badge">
                {getModeIcon()}
                {mode}
              </span>
              <h2>Results</h2>
              <p className="results-status" role="status">
                {resultCount} {resultCount === 1 ? "title" : "titles"} found
                {lastQuery && (
                  <>
                    {" "}for <q dir="auto">{lastQuery}</q>
                  </>
                )}
              </p>
            </div>
          </div>

          {resultCount === 0 ? (
            <div className="empty-state">
              <SearchX size={36} aria-hidden="true" />
              <h3>No matching titles</h3>
              <p>
                Try a broader topic, check the spelling, or pick one of the
                example queries above.
              </p>
            </div>
          ) : mode === "Research Mode" ? (
            <div className="roadmap">
              {Object.entries(results || {}).map(([step, books], stepIndex) => (
                <div className="roadmap-step" key={step}>
                  <div className="step-number">{stepIndex + 1}</div>
                  <div className="step-content">
                    <h3>{step}</h3>
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
      )}
    </div>
  );
}

function SurveyChart({ title, note, data, max }) {
  return (
    <div className="survey-chart"><div className="chart-title"><h3>{title}</h3>{note && <span>{note}</span>}</div><div className="bars">{data.map(([label, value, percent]) => <div className="bar-row" key={label}><div className="bar-label"><span>{label}</span><b>{percent}</b></div><div className="bar-track"><span style={{ width: `${(value / max) * 100}%` }} /></div><small>{value} responses</small></div>)}</div></div>
  );
}

export default App;
