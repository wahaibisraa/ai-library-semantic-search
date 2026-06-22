import os, sys, math, re
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords

sys.stdout.reconfigure(encoding="utf-8")
nltk.download("stopwords", quiet=True)

_stemmer = PorterStemmer()
_stop_words = set(stopwords.words("english"))

def preprocess(text):
    tokens = re.findall(r"\b[a-z]+\b", str(text).lower())
    return " ".join(_stemmer.stem(t) for t in tokens if t not in _stop_words)

library_df = pd.read_excel("data/Metadata (UTAS-Library)_with_abstract_descriptions.xlsx")
students_df = pd.read_excel("data/library_synthetic_user_data.xlsx", sheet_name="Student_Profiles")
search_df   = pd.read_excel("data/library_synthetic_user_data.xlsx", sheet_name="Search_History")
borrow_df   = pd.read_excel("data/library_synthetic_user_data.xlsx", sheet_name="Borrow_History")
library_df.columns = library_df.columns.str.strip()

def _build_book_text(row):
    title = str(row.get("title","") or "")
    subjects = str(row.get("subjects","") or "")
    author = str(row.get("author","") or "")
    notes = str(row.get("notes","") or "")
    description = str(row.get("descriptions","") or "")
    return (title+" ")*3 + (subjects+" ")*2 + author+" " + notes+" " + description

library_df["Book_Text"] = library_df.apply(_build_book_text, axis=1)
library_df["Book_Text_Processed"] = library_df["Book_Text"].apply(preprocess)

students_df["Student_Profile"] = (
    students_df["Department"].fillna("").astype(str) + " " +
    students_df["Course"].fillna("").astype(str) + " " +
    students_df["Interests"].fillna("").astype(str)
).str.lower()

vectorizer = TfidfVectorizer(max_features=10000, ngram_range=(1,2), sublinear_tf=True, min_df=2)
book_vectors = vectorizer.fit_transform(library_df["Book_Text_Processed"])
_MIN_SCORE = 0.03

def build_user_profile(student_id):
    student = students_df[students_df["Student_ID"] == student_id]
    if student.empty: return None
    profile = student["Student_Profile"].iloc[0]
    searches = search_df[search_df["Student_ID"] == student_id]["Search_Query"].fillna("").tolist()
    borrows = borrow_df[borrow_df["Student_ID"] == student_id]
    borrowed_text = []
    for col in ("Book_Title","Title","title","Subjects","subjects"):
        if col in borrows.columns:
            borrowed_text.extend(borrows[col].fillna("").astype(str).tolist())
    profile += " " + " ".join(searches) + " " + " ".join(borrowed_text)
    return profile

def _relevant_indices(pattern):
    mask = library_df["subjects"].fillna("").str.lower().str.contains(pattern, regex=True, na=False)
    return set(library_df[mask].index.tolist())

def _keyword_indices(query, top_n=10):
    tokens = [t for t in re.findall(r"\b[a-z]+\b", query.lower()) if t not in _stop_words]
    if not tokens: return []
    combined = library_df["title"].fillna("").str.lower() + " " + library_df["subjects"].fillna("").str.lower()
    scores = pd.Series(0.0, index=library_df.index)
    for t in tokens:
        scores += combined.str.count(r"\b" + re.escape(t) + r"\b")
    return scores[scores>0].nlargest(top_n).index.tolist()

def _semantic_indices(query, top_n=10):
    processed = preprocess(query)
    qv = vectorizer.transform([processed])
    sims = cosine_similarity(qv, book_vectors).flatten()
    top_k = sims.argsort()[-top_n:][::-1]
    filtered = [int(i) for i in top_k if sims[i] >= _MIN_SCORE]
    return filtered or [int(top_k[0])]

def _recommend_indices(student_id, top_n=10):
    profile = build_user_profile(student_id)
    if not profile: return []
    pv = vectorizer.transform([preprocess(profile)])
    sims = cosine_similarity(pv, book_vectors).flatten()
    return [int(i) for i in sims.argsort()[-top_n:][::-1]]

def _research_indices(topic):
    seen, result = set(), []
    for step_q in [
        "introduction fundamentals " + topic,
        "applications practical " + topic,
        "advanced research " + topic
    ]:
        for i in _semantic_indices(step_q, top_n=3):
            if i not in seen:
                seen.add(i); result.append(i)
    return result

def _prf(retrieved, relevant):
    if not retrieved or not relevant: return 0.0, 0.0, 0.0
    tp = len(set(retrieved) & relevant)
    p = tp/len(retrieved); r = tp/len(relevant)
    f1 = 2*p*r/(p+r) if (p+r)>0 else 0.0
    return round(p,3), round(r,3), round(f1,3)

def _ap(retrieved, relevant):
    if not retrieved or not relevant: return 0.0
    hits, sum_p = 0, 0.0
    for k, idx in enumerate(retrieved, 1):
        if idx in relevant:
            hits += 1; sum_p += hits/k
    return round(sum_p/len(relevant), 3)

def _ndcg(retrieved, relevant):
    if not retrieved or not relevant: return 0.0
    dcg = sum(1.0/math.log2(k+1) for k, idx in enumerate(retrieved,1) if idx in relevant)
    ideal_hits = min(len(relevant), len(retrieved))
    idcg = sum(1.0/math.log2(k+1) for k in range(1, ideal_hits+1))
    return round(dcg/idcg, 3) if idcg>0 else 0.0

def _mrr(retrieved, relevant):
    for k, idx in enumerate(retrieved, 1):
        if idx in relevant: return round(1.0/k, 3)
    return 0.0

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
    "Recommend": [
        ("ST001", r"database|security"),
        ("ST002", r"security|database"),
        ("ST003", r"artificial intelligence"),
        ("ST004", r"artificial intelligence|database"),
        ("ST005", r"software engineer|security"),
    ],
}
_EVAL_K = 10

def avg(ms, col): return round(sum(m[col] for m in ms)/len(ms), 3) if ms else 0.0

all_results = {}
for mode, test_cases in _EVAL_QUERIES.items():
    kw_metrics, sem_metrics = [], []
    for case in test_cases:
        if mode == "Recommend":
            sid, pattern = case
            relevant = _relevant_indices(pattern)
            if not relevant: continue
            kw = _keyword_indices(build_user_profile(sid) or "", _EVAL_K)
            sem = _recommend_indices(sid, _EVAL_K)
        else:
            topic, pattern = case
            relevant = _relevant_indices(pattern)
            if not relevant: continue
            kw = _keyword_indices(topic, _EVAL_K)
            if mode == "Study":
                sem = _semantic_indices("beginner fundamentals introduction " + topic, _EVAL_K)
            elif mode == "Research":
                sem = _research_indices(topic)
            else:
                sem = _semantic_indices(topic, _EVAL_K)
        kw_metrics.append(_prf(kw,relevant) + (_ap(kw,relevant), _ndcg(kw,relevant), _mrr(kw,relevant)))
        sem_metrics.append(_prf(sem,relevant) + (_ap(sem,relevant), _ndcg(sem,relevant), _mrr(sem,relevant)))

    n = len(kw_metrics)
    kw_r  = [avg(kw_metrics,i) for i in range(6)]
    sem_r = [avg(sem_metrics,i) for i in range(6)]
    all_results[mode] = {"kw": kw_r, "sem": sem_r, "n": n}

print("=== EVALUATION RESULTS (K=10) ===")
print()
header = f"{'Mode':<12} {'Sys':<5} {'P':>7} {'R':>7} {'F1':>7} {'MAP':>7} {'NDCG':>7} {'MRR':>7}  {'#Q':>3}"
print(header)
print("-" * 72)
for mode, res in all_results.items():
    kw = res["kw"]; sem = res["sem"]; n = res["n"]
    print(f"{mode:<12} {'KW':<5} {kw[0]:>7.3f} {kw[1]:>7.3f} {kw[2]:>7.3f} {kw[3]:>7.3f} {kw[4]:>7.3f} {kw[5]:>7.3f}  {n:>3}")
    print(f"{'':12} {'SEM':<5} {sem[0]:>7.3f} {sem[1]:>7.3f} {sem[2]:>7.3f} {sem[3]:>7.3f} {sem[4]:>7.3f} {sem[5]:>7.3f}")
    def sign(x): return ("+" if x >= 0 else "") + f"{x:.3f}"
    df1=sem[2]-kw[2]; dmap=sem[3]-kw[3]; dndcg=sem[4]-kw[4]; dmrr=sem[5]-kw[5]
    print(f"{'':12} {'DELTA':<5} {'':>7} {'':>7} {sign(df1):>7} {sign(dmap):>7} {sign(dndcg):>7} {sign(dmrr):>7}")
    print()

print("=== GROUND TRUTH SIZES ===")
all_queries = []
for mode, test_cases in _EVAL_QUERIES.items():
    for case in test_cases:
        if mode == "Recommend":
            sid, pattern = case
            rel = _relevant_indices(pattern)
            print(f"  [{mode}] student={sid}  pattern={pattern!r}  |relevant|={len(rel)}")
        else:
            topic, pattern = case
            rel = _relevant_indices(pattern)
            print(f"  [{mode}] query={topic!r}  |relevant|={len(rel)}")
