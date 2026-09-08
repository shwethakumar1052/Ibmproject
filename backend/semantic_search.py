"""
GovMatch AI — Semantic Vector Search Microservice
Flask on port 5002 | spaCy + SentenceTransformer + cosine similarity
"""

import os
import json
import time
import logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import spacy

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
SCHEMES_PATH    = os.path.join(BASE_DIR, "schemes_enhanced.json")
CACHE_EMB       = os.path.join(BASE_DIR, "embeddings_cache.npy")
CACHE_TEXTS     = os.path.join(BASE_DIR, "scheme_texts_cache.json")

# ---------------------------------------------------------------------------
# Domain Synonym Map
# ---------------------------------------------------------------------------
SYNONYM_MAP = {
    # Education
    "scholarship":   ["grant", "fellowship", "education", "stipend", "fees", "college", "tuition", "merit"],
    "student":       ["learner", "pupil", "education", "school", "college", "university"],
    "education":     ["school", "college", "learning", "scholarship", "literacy", "study"],
    # Agriculture
    "farmer":        ["kisan", "agriculture", "crop", "seeds", "harvest", "horticulture", "fasal", "irrigation"],
    "agriculture":   ["farmer", "kisan", "crop", "rural", "soil", "fertilizer", "horticulture"],
    "crop":          ["fasal", "harvest", "agriculture", "farming", "seeds"],
    # Women
    "women":         ["female", "girl", "mother", "widow", "maternity", "mahila", "beti", "shakti"],
    "girl":          ["women", "female", "beti", "daughter", "mahila", "child"],
    "mahila":        ["women", "female", "girl", "mother", "widow"],
    "widow":         ["women", "female", "single mother", "bereaved"],
    "maternity":     ["pregnant", "mother", "childbirth", "women", "delivery"],
    # Business & Finance
    "business":      ["entrepreneur", "startup", "msme", "trade", "loan", "subsidy", "enterprise", "commerce"],
    "loan":          ["credit", "finance", "mudra", "bank", "borrow", "subsidy", "fund"],
    "startup":       ["business", "entrepreneur", "innovation", "msme", "incubation"],
    "msme":          ["small business", "micro enterprise", "startup", "industry", "manufacturing"],
    "entrepreneur":  ["business", "startup", "msme", "self employed", "enterprise"],
    "subsidy":       ["grant", "assistance", "support", "benefit", "scheme", "fund"],
    # Disability
    "disabled":      ["divyangjan", "handicap", "disability", "locomotor", "impairment", "specially abled"],
    "divyangjan":    ["disabled", "handicap", "disability", "specially abled", "impairment"],
    "disability":    ["divyangjan", "handicap", "disabled", "locomotor", "impairment"],
    # Health
    "health":        ["medical", "hospital", "treatment", "insurance", "ayushman", "wellness", "medicine"],
    "hospital":      ["health", "medical", "treatment", "clinic", "healthcare"],
    "insurance":     ["health cover", "policy", "ayushman", "protection", "bima"],
    # Housing
    "housing":       ["home", "house", "awas", "shelter", "accommodation", "flat"],
    "home":          ["house", "awas", "housing", "shelter", "flat", "residence"],
    # Employment
    "job":           ["employment", "work", "career", "skill", "training", "livelihood"],
    "employment":    ["job", "work", "career", "skill training", "livelihood", "pmkvy"],
    "skill":         ["training", "employment", "job", "certification", "vocational", "pmkvy"],
    # Social / Caste
    "sc":            ["scheduled caste", "dalit", "backward", "reservation"],
    "st":            ["scheduled tribe", "tribal", "adivasi", "forest dweller"],
    "obc":           ["other backward class", "backward", "reservation"],
    "bpl":           ["below poverty line", "poor", "low income", "ration card"],
    # Rural / Urban
    "rural":         ["village", "gram", "panchayat", "agriculture", "kisan"],
    "urban":         ["city", "town", "municipal", "metro", "awas"],
    # Senior Citizens
    "senior":        ["elderly", "old age", "pension", "retired", "60 years"],
    "pension":       ["senior citizen", "elderly", "old age", "retirement", "annuity"],
    # General welfare
    "food":          ["ration", "nutrition", "meal", "mid day meal", "annapurna"],
    "water":         ["sanitation", "irrigation", "drinking water", "swachh"],
    "energy":        ["solar", "electricity", "power", "renewable", "fuel"],
}


# ---------------------------------------------------------------------------
# NLP Utilities
# ---------------------------------------------------------------------------
def load_nlp():
    log.info("Loading spaCy model: en_core_web_sm ...")
    return spacy.load("en_core_web_sm")


def lemmatize_and_expand(text: str, nlp) -> str:
    """
    Lemmatize tokens with spaCy, then expand known domain terms
    via SYNONYM_MAP. Returns enriched string for embedding.
    """
    doc = nlp(text.lower())
    tokens = [
        token.lemma_ for token in doc
        if not token.is_stop and not token.is_punct and token.lemma_.strip()
    ]
    expanded = list(tokens)
    for token in tokens:
        if token in SYNONYM_MAP:
            expanded.extend(SYNONYM_MAP[token])
    return " ".join(expanded)


def build_corpus_text(scheme: dict) -> str:
    """
    Combine key fields into a single rich text string for embedding.
    """
    parts = [
        scheme.get("name", ""),
        scheme.get("brief_description", ""),
        scheme.get("detailed_description", ""),
        scheme.get("benefits", ""),
        scheme.get("eligibility", ""),
        scheme.get("scheme_type", ""),
        scheme.get("ministry", ""),
        scheme.get("department", ""),
        scheme.get("category", ""),
        scheme.get("state", ""),
        scheme.get("nlp_corpus", ""),
    ]
    return " ".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# Embedding Cache
# ---------------------------------------------------------------------------
def load_or_build_embeddings(schemes: list, model, nlp):
    """
    Load embeddings from disk cache if scheme texts match, otherwise
    recompute and persist to disk.
    """
    # Build current corpus texts
    raw_texts   = [build_corpus_text(s) for s in schemes]
    clean_texts = [lemmatize_and_expand(t, nlp) for t in raw_texts]

    # Try loading cache
    if os.path.exists(CACHE_EMB) and os.path.exists(CACHE_TEXTS):
        with open(CACHE_TEXTS, "r", encoding="utf-8") as f:
            cached_texts = json.load(f)
        if cached_texts == clean_texts:
            log.info("Cache hit — loading embeddings from disk.")
            embeddings = np.load(CACHE_EMB)
            log.info(f"Loaded {len(embeddings)} cached embeddings. Shape: {embeddings.shape}")
            return embeddings, clean_texts

    # Cache miss — recompute
    log.info(f"Cache miss — computing embeddings for {len(clean_texts)} schemes ...")
    t0 = time.time()
    embeddings = model.encode(clean_texts, show_progress_bar=True, batch_size=32)
    elapsed = time.time() - t0
    log.info(f"Encoded {len(embeddings)} embeddings in {elapsed:.2f}s. Shape: {embeddings.shape}")

    np.save(CACHE_EMB, embeddings)
    with open(CACHE_TEXTS, "w", encoding="utf-8") as f:
        json.dump(clean_texts, f, ensure_ascii=False)
    log.info(f"Saved cache: {CACHE_EMB} | {CACHE_TEXTS}")

    return embeddings, clean_texts


# ---------------------------------------------------------------------------
# App Bootstrap — Flask starts immediately, embeddings built in background
# ---------------------------------------------------------------------------
import threading

app = Flask(__name__)
CORS(app)

log.info("=" * 60)
log.info("GovMatch AI — Semantic Search Service starting up ...")
log.info("=" * 60)

# Global state — populated by background thread
SCHEMES      = []
NLP          = None
MODEL        = None
EMBEDDINGS   = None
CORPUS_TEXTS = []
_READY       = False   # True once embeddings are loaded


def _bootstrap():
    """Load models + build embeddings in a background thread."""
    global SCHEMES, NLP, MODEL, EMBEDDINGS, CORPUS_TEXTS, _READY

    # Load schemes
    if not os.path.exists(SCHEMES_PATH):
        log.error(f"schemes_enhanced.json not found at {SCHEMES_PATH}. Run import_dataset.py first.")
        return

    with open(SCHEMES_PATH, "r", encoding="utf-8") as f:
        SCHEMES = json.load(f)
    log.info(f"Loaded {len(SCHEMES)} schemes from {SCHEMES_PATH}")

    # Load NLP models
    NLP   = load_nlp()
    MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    log.info("SentenceTransformer model loaded: all-MiniLM-L6-v2")

    # Build / load embeddings
    EMBEDDINGS, CORPUS_TEXTS = load_or_build_embeddings(SCHEMES, MODEL, NLP)

    _READY = True
    log.info("Semantic search service READY.")
    log.info("=" * 60)


# Start background thread immediately so Flask can respond to health checks
threading.Thread(target=_bootstrap, daemon=True).start()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    """
    Always returns HTTP 200 so Docker health check passes immediately.
    'status' is 'starting' while embeddings load, 'ok' when ready.
    """
    if not _READY:
        return jsonify({
            "status": "starting",
            "service": "GovMatch AI Semantic Search",
            "message": "Loading models and building embeddings, please wait..."
        }), 200   # 200 so Docker marks container healthy right away

    return jsonify({
        "status": "ok",
        "service": "GovMatch AI Semantic Search",
        "model": "all-MiniLM-L6-v2",
        "spacy_model": "en_core_web_sm",
        "schemes_loaded": len(SCHEMES),
        "embeddings_cached": int(EMBEDDINGS.shape[0]),
        "embedding_dim":    int(EMBEDDINGS.shape[1]),
        "cache_files": {
            "embeddings": os.path.exists(CACHE_EMB),
            "texts":      os.path.exists(CACHE_TEXTS),
        }
    }), 200


@app.route("/search", methods=["POST"])
def search():
    body = request.get_json(silent=True) or {}
    query = str(body.get("query", "")).strip()
    top_k = int(body.get("top_k", 50))

    if not query:
        return jsonify({"error": "query field is required"}), 400

    top_k = max(1, min(top_k, len(SCHEMES)))

    # Return 503 while still loading
    if not _READY:
        return jsonify({"error": "Service is still loading. Please retry in a moment."}), 503

    # Preprocess + encode query
    clean_query  = lemmatize_and_expand(query, NLP)
    query_vector = MODEL.encode([clean_query])   # shape (1, dim)

    # Cosine similarity against all scheme embeddings
    scores = cosine_similarity(query_vector, EMBEDDINGS)[0]   # shape (n,)

    # Rank by score descending
    ranked_indices = np.argsort(scores)[::-1][:top_k]

    results = []
    for idx in ranked_indices:
        scheme = SCHEMES[idx]
        results.append({
            "id":       scheme.get("slug", str(scheme.get("id", idx))),
            "score":    round(float(scores[idx]), 6),
            "name":     scheme.get("name", ""),
            "category": scheme.get("category", ""),
            "state":    scheme.get("state", ""),
        })

    return jsonify({
        "query":          query,
        "clean_query":    clean_query,
        "top_k":          top_k,
        "total_schemes":  len(SCHEMES),
        "results":        results
    })


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("SEMANTIC_PORT", 5002))
    log.info(f"Starting Flask on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
