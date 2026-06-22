import { useState } from "react";
import axios from "axios";
import {
  Search,
  BookOpen,
  Sparkles,
  GraduationCap,
  Compass,
  UserRound,
  Loader2,
  Star,
  BarChart2,
} from "lucide-react";
import "./App.css";
import Analytics from "./Analytics.jsx";

const MODE_OPTIONS = [
  { key: "search", label: "Search", icon: Search },
  { key: "recommend", label: "Recommend", icon: UserRound },
  { key: "study", label: "Study", icon: GraduationCap },
  { key: "research", label: "Research", icon: Compass },
];

function App() {
  const [page, setPage] = useState("home");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [manualMode, setManualMode] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

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
      const payload = { query };
      if (manualMode) payload.force_mode = manualMode;
      const response = await axios.post("http://127.0.0.1:5000/smart-search", payload);

      setMode(response.data.mode);
      setResults(response.data.results);
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend. Make sure Flask is running.");
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

  const renderBookCard = (book, index) => (
    <div className="book-card" key={index}>
      <div className="card-top">
        <span className="rank">#{index + 1}</span>
        {book.score !== undefined && (
          <span className="score">
            <Star size={14} />
            {(book.score * 100).toFixed(1)}%
          </span>
        )}
      </div>

      <h3>{book.title || "Untitled Book"}</h3>

      <p className="meta">
        <b>Author:</b> {book.author || "Unknown"}
      </p>

      <p className="meta">
        <b>Publisher:</b> {book.publisher || "Unknown"}
      </p>

      <p className="subjects">
        {book.subjects || "No subjects available"}
      </p>

      {book.description && (
        <p className="description">{book.description}</p>
      )}
    </div>
  );

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <BookOpen />
          <span>Smart AI Library</span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab${page === "home" ? " active" : ""}`}
            onClick={() => setPage("home")}
          >
            <Search size={15} />
            Search
          </button>
          <button
            className={`nav-tab${page === "analytics" ? " active" : ""}`}
            onClick={() => setPage("analytics")}
          >
            <BarChart2 size={15} />
            Analytics
          </button>
        </div>
      </nav>

      {page === "analytics" ? (
        <Analytics />
      ) : (
        <>
        <section className="hero">
        <div className="hero-badge">
          <Sparkles size={18} />
          AI-Powered Academic Assistant
        </div>

        <h1>One Search. Multiple Academic Supports.</h1>

        <p>
          Search books, get personalized recommendations, prepare for courses,
          and generate research roadmaps using one intelligent library assistant.
        </p>

        <div className="search-panel">
          <Search className="search-icon" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && smartSearch()}
            placeholder="Try: machine learning | recommend books for ST001 | study cybersecurity | research AI ethics"
          />
          <button onClick={smartSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spin" size={18} /> Searching
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>

        <div className="mode-selector">
          {MODE_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`mode-btn${manualMode === key ? " active" : ""}`}
              onClick={() => setManualMode(manualMode === key ? null : key)}
              title={manualMode === key ? `Click to disable ${label} override` : `Force ${label} mode`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="prompt-chips">
          {examples.map((item) => (
            <button key={item} onClick={() => setQuery(item)}>
              {item}
            </button>
          ))}
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

      {mode && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <span className="mode-badge">
                {getModeIcon()}
                {mode}
              </span>
              <h2>Results</h2>
            </div>
          </div>

          {mode === "Research Mode" ? (
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

export default App;