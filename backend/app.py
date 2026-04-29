from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

# Load dataset
df = pd.read_csv("data/clean_library_data.csv")
df["Search_Text"] = df["Search_Text"].fillna("").astype(str).str.lower()

# Build model
vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1, 2))
book_vectors = vectorizer.fit_transform(df["Search_Text"])

# Search function
def search_books(query, top_n=10):
    query_vector = vectorizer.transform([query.lower()])
    similarities = cosine_similarity(query_vector, book_vectors).flatten()
    top_indices = similarities.argsort()[-top_n:][::-1]

    results = df.iloc[top_indices].copy()
    results["Similarity_Score"] = similarities[top_indices]

    return results[[
        "Title",
        "Author",
        "Subjects",
        "Publication_Year",
        "Publisher",
        "Similarity_Score"
    ]].fillna("").to_dict(orient="records")

# API route
@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "")
    results = search_books(query)
    return jsonify(results)

# Test route
@app.route("/stats", methods=["GET"])
def stats():
    return jsonify({
        "total_books": len(df),
        "message": "Backend is working"
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)