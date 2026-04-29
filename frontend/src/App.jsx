import { useState } from "react";
import axios from "axios";
import { Search, BookOpen, Sparkles, User, Calendar, Building2 } from "lucide-react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchBooks = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post("http://127.0.0.1:5000/search", {
        query: query,
      });
      setResults(response.data);
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <BookOpen />
          <span>Smart Library AI</span>
        </div>
        <div className="nav-tag">Academic Search Prototype</div>
      </nav>

      <section className="hero">
        <div className="badge">
          <Sparkles size={18} />
          NLP-Based Information Retrieval System
        </div>

        <h1>Search Library Resources Using Natural Language</h1>

        <p>
          An AI-powered prototype that helps students find relevant academic
          books using conversational queries instead of exact keywords.
        </p>

        <div className="search-card">
          <Search className="search-icon" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchBooks()}
            placeholder="Try: machine learning, cybersecurity, الذكاء الاصطناعي"
          />
          <button onClick={searchBooks}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="examples">
          <button onClick={() => setQuery("machine learning")}>machine learning</button>
          <button onClick={() => setQuery("cybersecurity")}>cybersecurity</button>
          <button onClick={() => setQuery("الذكاء الاصطناعي")}>الذكاء الاصطناعي</button>
        </div>
      </section>

      <section className="results-section">
        <div className="results-header">
          <h2>Search Results</h2>
          <span>{results.length} books found</span>
        </div>

        {results.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={46} />
            <h3>No results yet</h3>
            <p>Enter a query above to discover relevant library resources.</p>
          </div>
        ) : (
          <div className="cards">
            {results.map((book, index) => (
              <div className="book-card" key={index}>
                <div className="rank">#{index + 1}</div>

                <h3>{book.Title}</h3>

                <div className="info">
                  <p>
                    <User size={16} />
                    {book.Author || "Unknown author"}
                  </p>
                  <p>
                    <Calendar size={16} />
                    {book.Publication_Year || "Unknown year"}
                  </p>
                  <p>
                    <Building2 size={16} />
                    {book.Publisher || "Unknown publisher"}
                  </p>
                </div>

                <div className="subjects">
                  {book.Subjects || "No subjects available"}
                </div>

                <div className="score">
                  Similarity Score: {(book.Similarity_Score * 100).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;