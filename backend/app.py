from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ===============================
# Flask Setup
# ===============================

app = Flask(__name__)
CORS(app)

# ===============================
# Load Data
# ===============================

library_df = pd.read_excel(
    "data/Metadata (UTAS-Library)_with_abstract_descriptions.xlsx"
)

students_df = pd.read_excel(
    "data/library_synthetic_user_data.xlsx",
    sheet_name="Student_Profiles"
)

search_df = pd.read_excel(
    "data/library_synthetic_user_data.xlsx",
    sheet_name="Search_History"
)

borrow_df = pd.read_excel(
    "data/library_synthetic_user_data.xlsx",
    sheet_name="Borrow_History"
)

# ===============================
# Clean Columns
# ===============================

library_df.columns = library_df.columns.str.strip()

# ===============================
# Build Search Content
# ===============================

library_df["Book_Text"] = (

    library_df["title"].fillna("").astype(str)

    + " "

    + library_df["author"].fillna("").astype(str)

    + " "

    + library_df["subjects"].fillna("").astype(str)

    + " "

    + library_df["notes"].fillna("").astype(str)

    + " "

    + library_df["descriptions"].fillna("").astype(str)

)

library_df["Book_Text"] = (
    library_df["Book_Text"]
    .str.lower()
)

# ===============================
# Student Profile
# ===============================

students_df["Student_Profile"]=(

students_df["Department"]
.fillna("")
.astype(str)

+" "+

students_df["Course"]
.fillna("")
.astype(str)

+" "+

students_df["Interests"]
.fillna("")
.astype(str)

)

students_df["Student_Profile"]=(
students_df["Student_Profile"]
.str.lower()
)

# ===============================
# Build Model
# ===============================

vectorizer = TfidfVectorizer(
    max_features=8000,
    ngram_range=(1,2)
)

book_vectors=vectorizer.fit_transform(
library_df["Book_Text"]
)

# ===============================
# Functions
# ===============================

def format_results(df,score_column):

    results=[]

    for _,row in df.iterrows():

        results.append({

        "title":str(row.get("title","")),
        "author":str(row.get("author","")),
        "subjects":str(row.get("subjects","")),
        "publisher":str(row.get("publisher","")),
        "description":
        str(
        row.get(
        "descriptions",""
        )
        )[:300],

        "score":
        round(
        float(
        row.get(
        score_column,
        0
        )
        ),4)

        })

    return results


# ===============================
# Search
# ===============================

def search_books(query,top_n=10):

    query_vector=vectorizer.transform(
    [query]
    )

    similarities=cosine_similarity(
    query_vector,
    book_vectors
    ).flatten()

    top_indices=(
    similarities.argsort()
    [-top_n:][::-1]
    )

    results=library_df.iloc[
    top_indices
    ].copy()

    results[
    "Similarity_Score"
    ]=similarities[top_indices]

    return format_results(
    results,
    "Similarity_Score"
    )


# ===============================
# Recommendation
# ===============================

def build_user_profile(student_id):

    student=students_df[
    students_df[
    "Student_ID"
    ]==student_id
    ]

    if student.empty:

        return None

    profile=student[
    "Student_Profile"
    ].iloc[0]

    searches=search_df[
    search_df[
    "Student_ID"
    ]==student_id
    ][
    "Search_Query"
    ].fillna(
    ""
    ).tolist()

    profile+=" "+" ".join(
    searches
    )

    return profile


def recommend_books(
student_id,
top_n=10
):

    profile=build_user_profile(
    student_id
    )

    if profile is None:

        return []

    profile_vector=(
    vectorizer.transform(
    [profile]
    )
    )

    similarities=(
    cosine_similarity(
    profile_vector,
    book_vectors
    ).flatten()
    )

    top_indices=(
    similarities.argsort()
    [-top_n:][::-1]
    )

    results=library_df.iloc[
    top_indices
    ].copy()

    results[
    "Recommendation_Score"
    ]=similarities[
    top_indices
    ]

    return format_results(
    results,
    "Recommendation_Score"
    )

# ===============================
# Study Mode
# ===============================

def study_mode(course):

    query=f"""

    beginner
    fundamentals
    introduction
    {course}

    """

    return search_books(
    query,
    8
    )

# ===============================
# Research Mode
# ===============================

def research_mode(topic):

    return {

    "Step 1: Fundamentals":
    search_books(
    f"introduction {topic}",
    3
    ),

    "Step 2: Applications":
    search_books(
    f"applications {topic}",
    3
    ),

    "Step 3: Advanced Topics":
    search_books(
    f"advanced {topic}",
    3
    )

    }

# ===============================
# Routes
# ===============================

@app.route("/")

def home():

    return jsonify({

    "message":
    "AI Library Backend Running",

    "features":[

    "Semantic Search",
    "Recommendations",
    "Study Mode",
    "Research Mode"

    ]

    })


@app.route(
"/smart-search",
methods=["POST"]
)

def smart_search():

    data=request.get_json()

    query=data.get(
    "query",
    ""
    ).lower()

    if not query:

        return jsonify(
        {"error":
        "query required"}
        )

    # Recommendation

    if "recommend" in query:

        words=query.split()

        for word in words:

            if word.upper().startswith(
            "ST"
            ):

                return jsonify({

                "mode":
                "Recommendation Mode",

                "results":
                recommend_books(
                word.upper()
                )

                })

    # Study

    if "study" in query:

        query=query.replace(
        "study",
        ""
        )

        return jsonify({

        "mode":
        "Study Mode",

        "results":
        study_mode(
        query
        )

        })

    # Research

    if "research" in query:

        query=query.replace(
        "research",
        ""
        )

        return jsonify({

        "mode":
        "Research Mode",

        "results":
        research_mode(
        query
        )

        })

    # Default

    return jsonify({

    "mode":
    "Semantic Search",

    "results":
    search_books(
    query
    )

    })


@app.route("/stats")

def stats():

    return jsonify({

    "total_books":
    len(library_df),

    "total_students":
    len(students_df),

    "total_searches":
    len(search_df),

    "total_borrows":
    len(borrow_df)

    })

# ===============================

if __name__=="__main__":

    app.run(
    debug=True,
    port=5000
    )