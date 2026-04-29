# 📚 AI-Powered Library Semantic Search System

## 📌 Overview
This project is an AI-powered semantic search system designed to improve how users search for books in a library. Unlike traditional keyword-based search, this system uses Natural Language Processing (NLP) techniques to understand user queries and return more relevant results.

---

## 🚀 Features
- Semantic search using natural language queries
- Improved search accuracy over keyword-based systems
- TF-IDF vectorization and cosine similarity
- Full-stack application (Frontend + Backend)
- User-friendly interface for searching books

---

## 🛠️ Technologies Used
**Frontend:**
- React

**Backend:**
- Flask (Python)

**AI / NLP:**
- TF-IDF (Text Vectorization)
- Cosine Similarity

**Other:**
- Pandas, NumPy

---

## 📊 How It Works
1. User enters a search query (e.g., "books about machine learning")
2. Text is preprocessed and converted into vectors using TF-IDF
3. Cosine similarity is calculated between query and book descriptions
4. The system returns the most relevant results


---

## ▶️ How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py

### Frontend
```bash
cd frontend
npm install
npm start
