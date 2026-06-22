from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import re
import math
import calendar
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords

nltk.download("stopwords", quiet=True)

# ===============================
# Flask Setup
# ===============================

app = Flask(__name__)
CORS(app)

# ===============================
# Text Preprocessing
# ===============================

_stemmer = PorterStemmer()
_stop_words = set(stopwords.words("english"))


def preprocess(text):
    """Lowercase, remove stop words, and stem tokens."""
    tokens = re.findall(r"\b[a-z]+\b", str(text).lower())
    return " ".join(_stemmer.stem(t) for t in tokens if t not in _stop_words)


# ===============================
# Load Data
# ===============================

library_df = pd.read_excel(
    "data/Metadata (UTAS-Library)_with_abstract_descriptions.xlsx"
)

students_df = pd.read_excel(
    "data/library_synthetic_user_data.xlsx",
    sheet_name="Student_Profiles",
)

search_df = pd.read_excel(
    "data/library_synthetic_user_data.xlsx",
    sheet_name="Search_History",
)

borrow_df = pd.read_excel(
    "data/library_synthetic_user_data.xlsx",
    sheet_name="Borrow_History",
)

# ===============================
# Clean Columns
# ===============================

library_df.columns = library_df.columns.str.strip()

# ===============================
# Build Weighted Book Text
# Title x3, Subjects x2, rest x1
# ===============================


def _build_book_text(row):
    title = str(row.get("title", "") or "")
    subjects = str(row.get("subjects", "") or "")
    author = str(row.get("author", "") or "")
    notes = str(row.get("notes", "") or "")
    description = str(row.get("descriptions", "") or "")
    return (
        (title + " ") * 3
        + (subjects + " ") * 2
        + author + " "
        + notes + " "
        + description
    )


library_df["Book_Text"] = library_df.apply(_build_book_text, axis=1)
library_df["Book_Text_Processed"] = library_df["Book_Text"].apply(preprocess)

# ===============================
# Student Profile
# ===============================

students_df["Student_Profile"] = (
    students_df["Department"].fillna("").astype(str)
    + " "
    + students_df["Course"].fillna("").astype(str)
    + " "
    + students_df["Interests"].fillna("").astype(str)
).str.lower()

# ===============================
# Build TF-IDF Model
# sublinear_tf: log(1+tf) dampens frequency dominance
# min_df=2:     drops terms appearing in only one document (noise)
# ===============================

vectorizer = TfidfVectorizer(
    max_features=10000,
    ngram_range=(1, 2),
    sublinear_tf=True,
    min_df=2,
)

book_vectors = vectorizer.fit_transform(library_df["Book_Text_Processed"])

# ===============================
# Helpers
# ===============================


def format_results(df, score_column):
    results = []
    for _, row in df.iterrows():
        results.append({
            "title": str(row.get("title", "")),
            "author": str(row.get("author", "")),
            "subjects": str(row.get("subjects", "")),
            "publisher": str(row.get("publisher", "")),
            "description": str(row.get("descriptions", ""))[:300],
            "score": round(float(row.get(score_column, 0)), 4),
        })
    return results


# ===============================
# Search
# ===============================

# Minimum cosine similarity to include a result (avoids surfacing unrelated books).
_MIN_SCORE = 0.03


def search_books(query, top_n=10):
    processed = preprocess(query)
    query_vector = vectorizer.transform([processed])
    similarities = cosine_similarity(query_vector, book_vectors).flatten()

    # Sort descending; take the top pool then apply threshold
    top_indices = similarities.argsort()[-top_n:][::-1]
    filtered = [i for i in top_indices if similarities[i] >= _MIN_SCORE]

    # Guarantee at least one result even if nothing clears the threshold
    if not filtered:
        filtered = [top_indices[0]]

    results = library_df.iloc[filtered].copy()
    results["Similarity_Score"] = similarities[filtered]
    return format_results(results, "Similarity_Score")


# ===============================
# Recommendation
# ===============================


def build_user_profile(student_id):
    student = students_df[students_df["Student_ID"] == student_id]
    if student.empty:
        return None

    profile = student["Student_Profile"].iloc[0]

    searches = (
        search_df[search_df["Student_ID"] == student_id]["Search_Query"]
        .fillna("")
        .tolist()
    )

    # Enrich profile with borrow history (try common column name variants)
    borrows = borrow_df[borrow_df["Student_ID"] == student_id]
    borrowed_text = []
    for col in ("Book_Title", "Title", "title", "Subjects", "subjects"):
        if col in borrows.columns:
            borrowed_text.extend(borrows[col].fillna("").astype(str).tolist())

    profile += " " + " ".join(searches) + " " + " ".join(borrowed_text)
    return profile


def recommend_books(student_id, top_n=10):
    profile = build_user_profile(student_id)
    if profile is None:
        return []

    profile_vector = vectorizer.transform([preprocess(profile)])
    similarities = cosine_similarity(profile_vector, book_vectors).flatten()

    top_indices = similarities.argsort()[-top_n:][::-1]

    results = library_df.iloc[top_indices].copy()
    results["Recommendation_Score"] = similarities[top_indices]
    return format_results(results, "Recommendation_Score")


# ===============================
# Study Mode
# ===============================


def study_mode(course):
    query = f"beginner fundamentals introduction {course}"
    return search_books(query, 8)


# ===============================
# Research Mode
# ===============================


def research_mode(topic):
    return {
        "Step 1: Fundamentals": search_books(f"introduction fundamentals {topic}", 3),
        "Step 2: Applications": search_books(f"applications practical {topic}", 3),
        "Step 3: Advanced Topics": search_books(f"advanced research {topic}", 3),
    }


# ===============================
# Routes
# ===============================


@app.route("/")
def home():
    return jsonify({
        "message": "AI Library Backend Running",
        "features": ["Semantic Search", "Recommendations", "Study Mode", "Research Mode"],
    })


@app.route("/smart-search", methods=["POST"])
def smart_search():
    data = request.get_json()
    query = data.get("query", "").lower().strip()
    force_mode = data.get("force_mode", "").lower().strip()

    if not query:
        return jsonify({"error": "query required"})

    # ---- Manual mode override (from frontend mode-selector buttons) ----

    if force_mode == "recommend":
        words = query.split()
        student_id = next((w.upper() for w in words if w.upper().startswith("ST")), None)
        results = recommend_books(student_id) if student_id else search_books(query)
        return jsonify({"mode": "Recommendation Mode", "results": results})

    if force_mode == "study":
        topic = re.sub(r"\bstudy\b", "", query).strip() or query
        return jsonify({"mode": "Study Mode", "results": study_mode(topic)})

    if force_mode == "research":
        topic = re.sub(r"\bresearch\b", "", query).strip() or query
        return jsonify({"mode": "Research Mode", "results": research_mode(topic)})

    if force_mode == "search":
        return jsonify({"mode": "Semantic Search", "results": search_books(query)})

    # ---- Auto-detect mode from query keywords ----

    if "recommend" in query:
        words = query.split()
        for word in words:
            if word.upper().startswith("ST"):
                return jsonify({
                    "mode": "Recommendation Mode",
                    "results": recommend_books(word.upper()),
                })

    if "study" in query:
        topic = re.sub(r"\bstudy\b", "", query).strip()
        return jsonify({"mode": "Study Mode", "results": study_mode(topic)})

    if "research" in query:
        topic = re.sub(r"\bresearch\b", "", query).strip()
        return jsonify({"mode": "Research Mode", "results": research_mode(topic)})

    return jsonify({"mode": "Semantic Search", "results": search_books(query)})


# ===============================
# Analytics  (lazily cached top-books computation)
# ===============================

_top_books_cache = None


def _get_top_books():
    global _top_books_cache
    if _top_books_cache is not None:
        return _top_books_cache
    counter = Counter()
    for sid in students_df["Student_ID"].tolist():
        for book in recommend_books(sid, top_n=5):
            counter[book["title"]] += 1
    _top_books_cache = [
        {
            "title": t,
            "short_title": t[:26] + "…" if len(t) > 26 else t,
            "count": c,
        }
        for t, c in counter.most_common(8)
    ]
    return _top_books_cache


def _infer_mode(q):
    q = str(q).lower()
    if "recommend" in q:
        return "Recommend"
    if "study" in q:
        return "Study"
    if "research" in q:
        return "Research"
    return "Search"


@app.route("/analytics")
def analytics():
    # Top searched topics
    top_searches = (
        search_df["Search_Query"]
        .value_counts()
        .head(8)
        .reset_index()
    )
    top_searches.columns = ["topic", "count"]

    # Mode usage distribution (inferred from query keywords)
    mode_counts = search_df["Search_Query"].apply(_infer_mode).value_counts()
    mode_distribution = [{"mode": m, "value": int(c)} for m, c in mode_counts.items()]

    # Monthly engagement trends
    s = search_df.copy()
    b = borrow_df.copy()
    s["month"] = pd.to_datetime(s["Timestamp"]).dt.strftime("%b")
    b["month"] = pd.to_datetime(b["Borrow_Date"]).dt.strftime("%b")

    s_monthly = s.groupby("month").size().reset_index(name="searches")
    b_monthly = b.groupby("month").size().reset_index(name="borrows")

    month_order = {m: i for i, m in enumerate(calendar.month_abbr) if m}
    trends = pd.merge(s_monthly, b_monthly, on="month", how="outer").fillna(0)
    trends["_order"] = trends["month"].map(month_order)
    trends = trends.sort_values("_order").drop(columns="_order")
    trends["searches"] = trends["searches"].astype(int)
    trends["borrows"] = trends["borrows"].astype(int)

    return jsonify({
        "top_searches": top_searches.to_dict(orient="records"),
        "top_books": _get_top_books(),
        "mode_distribution": mode_distribution,
        "engagement_trends": trends.to_dict(orient="records"),
    })


# ===============================
# Evaluation / Performance Comparison
# ===============================

# Each entry: (query_sent_to_system, exact_regex_pattern_on_raw_subjects)
_EVAL_QUERIES = {
    "Search": [
        ("computer networks",       r"\bcomputer network"),
        ("database systems",        r"\bdatabase\b"),
        ("computer security",       r"computer security"),
        ("programming",             r"\bprogramming\b"),
        ("image processing",        r"image processing"),
        ("artificial intelligence", r"artificial intelligence"),
        ("information systems",     r"information system"),
        ("data mining",             r"data mining"),
    ],
    "Study": [
        ("statistics",              r"\bstatistics\b"),
        ("calculus",                r"\bcalculus\b"),
        ("operating systems",       r"operating system"),
        ("programming",             r"\bprogramming\b"),
        ("computer networks",       r"\bcomputer network"),
        ("database",                r"\bdatabase\b"),
        ("software engineering",    r"software engineer"),
        ("management information",  r"management information"),
    ],
    "Research": [
        ("artificial intelligence", r"artificial intelligence"),
        ("computer security",       r"computer security"),
        ("data mining",             r"data mining"),
        ("image processing",        r"image processing"),
        ("wireless networks",       r"wireless"),
        ("e-commerce",              r"e-commerce|electronic commerce"),
        ("robotics",                r"\brobot"),
        ("software engineering",    r"software engineer"),
    ],
    # (student_id, subjects_pattern derived from their department + course)
    "Recommend": [
        ("ST001", r"database|security"),
        ("ST002", r"security|database"),
        ("ST003", r"artificial intelligence"),
        ("ST004", r"artificial intelligence|database"),
        ("ST005", r"software engineer|security"),
    ],
}

_EVAL_K = 10
_eval_cache = None


def _relevant_indices(pattern):
    """Books whose raw subjects field matches the given regex pattern."""
    mask = library_df["subjects"].fillna("").str.lower().str.contains(
        pattern, regex=True, na=False
    )
    return set(library_df[mask].index.tolist())


def _keyword_indices(query, top_n=10):
    """Baseline: unstemmed token-overlap scoring on title + subjects."""
    tokens = [t for t in re.findall(r"\b[a-z]+\b", query.lower()) if t not in _stop_words]
    if not tokens:
        return []
    combined = (
        library_df["title"].fillna("").str.lower()
        + " "
        + library_df["subjects"].fillna("").str.lower()
    )
    scores = pd.Series(0.0, index=library_df.index)
    for t in tokens:
        scores += combined.str.count(r"\b" + re.escape(t) + r"\b")
    return scores[scores > 0].nlargest(top_n).index.tolist()


def _semantic_indices(query, top_n=10):
    """Current semantic pipeline: returns positional integer indices."""
    processed = preprocess(query)
    qv = vectorizer.transform([processed])
    sims = cosine_similarity(qv, book_vectors).flatten()
    top_k = sims.argsort()[-top_n:][::-1]
    filtered = [int(i) for i in top_k if sims[i] >= _MIN_SCORE]
    return filtered or [int(top_k[0])]


def _recommend_indices(student_id, top_n=10):
    """Semantic recommendation indices for a student."""
    profile = build_user_profile(student_id)
    if not profile:
        return []
    pv = vectorizer.transform([preprocess(profile)])
    sims = cosine_similarity(pv, book_vectors).flatten()
    return [int(i) for i in sims.argsort()[-top_n:][::-1]]


def _research_indices(topic):
    """Flatten the 3-step research roadmap into a deduplicated index list."""
    seen, result = set(), []
    for step_q in [
        f"introduction fundamentals {topic}",
        f"applications practical {topic}",
        f"advanced research {topic}",
    ]:
        for i in _semantic_indices(step_q, top_n=3):
            if i not in seen:
                seen.add(i)
                result.append(i)
    return result


def _prf(retrieved, relevant):
    """Precision, Recall, F1 given a list of indices and a set of relevant indices."""
    if not retrieved or not relevant:
        return 0.0, 0.0, 0.0
    tp = len(set(retrieved) & relevant)
    p = tp / len(retrieved)
    r = tp / len(relevant)
    f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0.0
    return round(p, 3), round(r, 3), round(f1, 3)


def _ap(retrieved, relevant):
    """Average Precision (area under precision-recall curve)."""
    if not retrieved or not relevant:
        return 0.0
    hits, sum_p = 0, 0.0
    for k, idx in enumerate(retrieved, 1):
        if idx in relevant:
            hits += 1
            sum_p += hits / k
    return round(sum_p / len(relevant), 3)


def _ndcg(retrieved, relevant):
    """NDCG@K with binary relevance."""
    if not retrieved or not relevant:
        return 0.0
    dcg = sum(
        1.0 / math.log2(k + 1)
        for k, idx in enumerate(retrieved, 1)
        if idx in relevant
    )
    ideal_hits = min(len(relevant), len(retrieved))
    idcg = sum(1.0 / math.log2(k + 1) for k in range(1, ideal_hits + 1))
    return round(dcg / idcg, 3) if idcg > 0 else 0.0


def _mrr(retrieved, relevant):
    """Reciprocal Rank (1 / rank of first relevant result, 0 if none)."""
    for k, idx in enumerate(retrieved, 1):
        if idx in relevant:
            return round(1.0 / k, 3)
    return 0.0


@app.route("/evaluate")
def evaluate():
    global _eval_cache
    if _eval_cache is not None:
        return jsonify(_eval_cache)

    rows = []
    for mode, test_cases in _EVAL_QUERIES.items():
        kw_metrics, sem_metrics = [], []

        for case in test_cases:
            if mode == "Recommend":
                sid, pattern = case
                relevant = _relevant_indices(pattern)
                if not relevant:
                    continue
                kw = _keyword_indices(build_user_profile(sid) or "", _EVAL_K)
                sem = _recommend_indices(sid, _EVAL_K)
            else:
                topic, pattern = case
                relevant = _relevant_indices(pattern)
                if not relevant:
                    continue
                kw = _keyword_indices(topic, _EVAL_K)
                if mode == "Study":
                    sem = _semantic_indices(
                        f"beginner fundamentals introduction {topic}", _EVAL_K
                    )
                elif mode == "Research":
                    sem = _research_indices(topic)
                else:
                    sem = _semantic_indices(topic, _EVAL_K)

            kw_metrics.append(
                _prf(kw, relevant)
                + (_ap(kw, relevant), _ndcg(kw, relevant), _mrr(kw, relevant))
            )
            sem_metrics.append(
                _prf(sem, relevant)
                + (_ap(sem, relevant), _ndcg(sem, relevant), _mrr(sem, relevant))
            )

        def _avg(metrics, col):
            return round(sum(m[col] for m in metrics) / len(metrics), 3) if metrics else 0.0

        rows.append({
            "mode": mode,
            "queries_tested": len(kw_metrics),
            "keyword": {
                "precision": _avg(kw_metrics, 0),
                "recall":    _avg(kw_metrics, 1),
                "f1":        _avg(kw_metrics, 2),
                "map":       _avg(kw_metrics, 3),
                "ndcg":      _avg(kw_metrics, 4),
                "mrr":       _avg(kw_metrics, 5),
            },
            "semantic": {
                "precision": _avg(sem_metrics, 0),
                "recall":    _avg(sem_metrics, 1),
                "f1":        _avg(sem_metrics, 2),
                "map":       _avg(sem_metrics, 3),
                "ndcg":      _avg(sem_metrics, 4),
                "mrr":       _avg(sem_metrics, 5),
            },
        })

    _eval_cache = {
        "rows": rows,
        "k": _EVAL_K,
        "methodology": (
            "Ground truth: books whose subjects field contains the topic phrase "
            "(exact regex on raw catalog subjects — no stemming). "
            "Keyword baseline: unstemmed token-overlap scoring on title + subjects. "
            "Semantic: TF-IDF cosine similarity with PorterStemmer and stop-word removal. "
            "All metrics are macro-averaged over test queries at K=10. "
            "MAP = mean Average Precision (area under PR curve). "
            "NDCG = Normalized Discounted Cumulative Gain (binary relevance). "
            "MRR = Mean Reciprocal Rank (1/rank of first relevant result)."
        ),
    }
    return jsonify(_eval_cache)


@app.route("/stats")
def stats():
    return jsonify({
        "total_books": len(library_df),
        "total_students": len(students_df),
        "total_searches": len(search_df),
        "total_borrows": len(borrow_df),
    })


# ===============================

if __name__ == "__main__":
    app.run(debug=True, port=5000)
