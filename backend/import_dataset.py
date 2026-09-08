"""
GovMatch AI — Data Ingestion & Normalization Pipeline
Processes government_schemes_dataset_4430.csv into structured JSON for API + NLP layers.
"""

import csv
import json
import re
import unicodedata
import html
import os
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT_DIR, "government_schemes_dataset_4430.csv")
OUTPUT_ENHANCED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schemes_enhanced.json")
OUTPUT_SIMPLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schemes.json")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
INDIAN_STATES = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
    "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya",
    "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim",
    "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand",
    "west bengal",
    # Union Territories
    "delhi", "jammu and kashmir", "ladakh", "chandigarh", "dadra and nagar haveli",
    "daman and diu", "lakshadweep", "puducherry", "andaman and nicobar"
}

STATE_ABBREVIATIONS = {
    "mh": "maharashtra", "tn": "tamil nadu", "ka": "karnataka",
    "dl": "delhi", "up": "uttar pradesh", "mp": "madhya pradesh",
    "ap": "andhra pradesh", "ts": "telangana", "gj": "gujarat",
    "rj": "rajasthan", "wb": "west bengal", "pb": "punjab",
    "hr": "haryana", "kl": "kerala", "br": "bihar", "or": "odisha",
    "jk": "jammu and kashmir", "hp": "himachal pradesh", "uk": "uttarakhand",
    "as": "assam", "jh": "jharkhand", "cg": "chhattisgarh"
}

CATEGORY_KEYWORDS = {
    "Education & Learning": [
        "scholarship", "education", "school", "college", "university", "student",
        "learning", "tuition", "book", "literacy", "skill training", "coaching",
        "stipend", "fellowship", "merit", "dropout", "mid day meal", "breakfast"
    ],
    "Agriculture, Rural & Environment": [
        "farmer", "agriculture", "crop", "irrigation", "kisan", "rural", "soil",
        "fertilizer", "seed", "farm", "animal husbandry", "fishery", "horticulture",
        "watershed", "forest", "environment", "organic", "fasal", "bima"
    ],
    "Health & Wellness": [
        "health", "medical", "hospital", "insurance", "ayushman", "treatment",
        "medicine", "nutrition", "sanitation", "hygiene", "maternity", "pregnancy",
        "child health", "vaccination", "nhm", "nrhm", "wellness", "cancer", "tb"
    ],
    "Business & Entrepreneurship": [
        "loan", "startup", "business", "enterprise", "msme", "mudra", "entrepreneur",
        "credit", "subsidy", "investment", "industry", "manufacturing", "trade",
        "vendor", "commerce", "incubat", "innovati", "stand up", "svanidhi"
    ],
    "Skills & Employment": [
        "employment", "job", "skill", "training", "apprentice", "internship",
        "vocation", "pmkvy", "labour", "worker", "placement", "career",
        "workshop", "certification", "livelihood"
    ],
    "Women Empowerment": [
        "women", "girl", "mahila", "female", "beti", "widow", "maternity",
        "self help group", "shg", "gender", "domestic violence", "dowry",
        "sukanya", "samman", "ladli"
    ],
    "Social Welfare": [
        "pension", "disability", "senior citizen", "old age", "bpl", "poor",
        "housing", "awas", "toilet", "swachh", "jan dhan", "ration", "food",
        "security", "social", "tribal", "minority", "sc st", "dalit", "backward"
    ]
}

FEMALE_ONLY_TRIGGERS = [
    r'\bwomen only\b', r'\bonly women\b', r'\bfor women\b', r'\bgirl child\b',
    r'\bfemale beneficiar', r'\bmahila\b', r'\bwidow\b', r'\bonly for girls\b',
    r'\bonly girls\b', r'\bexclusively.*women\b', r'\bwomen.*exclusively\b'
]


# ---------------------------------------------------------------------------
# Text Cleaning — UI Presentation
# ---------------------------------------------------------------------------
def clean_readable_text(text: str) -> str:
    """Clean text for UI presentation: HTML decode, normalize whitespace."""
    if not text or str(text).strip() in ("", "nan", "None"):
        return ""
    text = str(text)
    # HTML entity decoding
    text = html.unescape(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize multiple spaces / tabs / newlines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ---------------------------------------------------------------------------
# Text Cleaning — NLP Pipeline
# ---------------------------------------------------------------------------
def clean_text_pipeline(text: str) -> str:
    """
    Clean text for NLP processing:
    - Unicode NFKC normalization
    - Preserve: number ranges (18-60), SC/ST, currency (Rs X lakh), abbreviations
    - Remove punctuation noise, extra whitespace
    """
    if not text or str(text).strip() in ("", "nan", "None"):
        return ""
    text = str(text)

    # NFKC normalization (handles ligatures, half-width chars, etc.)
    text = unicodedata.normalize("NFKC", text)

    # HTML entity decode
    text = html.unescape(text)

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)

    # Protect tokens we want to keep intact
    # Number ranges like 18-60, 50000-5lakh
    protected = {}
    counter = [0]

    def protect(pattern, repl_fn, t):
        def replacer(m):
            key = f"__PROT{counter[0]}__"
            protected[key] = repl_fn(m)
            counter[0] += 1
            return key
        return re.sub(pattern, replacer, t)

    # Protect SC/ST/OBC/EWS abbreviations
    text = protect(r'\b(SC|ST|OBC|EWS|BPL|APL|PHC|CHC|DBT|ASHA|NBFC|MFI|SHG|ULB)\b',
                   lambda m: m.group(0), text)
    # Protect currency values like Rs 10 lakh, Rs 6000
    text = protect(r'Rs\.?\s*[\d,]+(?:\s*(?:lakh|crore|thousand))?',
                   lambda m: m.group(0), text)
    # Protect number ranges like 18-60, 3.5-7
    text = protect(r'\b\d+(?:\.\d+)?[-–]\d+(?:\.\d+)?\b',
                   lambda m: m.group(0), text)
    # Protect percentages
    text = protect(r'\b\d+(?:\.\d+)?\s*%', lambda m: m.group(0), text)

    # Lowercase
    text = text.lower()

    # Remove special characters except letters, digits, spaces, protected tokens
    text = re.sub(r'[^\w\s]', ' ', text)

    # Restore protected tokens (lowercased original form)
    for key, val in protected.items():
        text = text.replace(key.lower(), val)

    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


# ---------------------------------------------------------------------------
# State Detector
# ---------------------------------------------------------------------------
def detect_state(row: dict) -> str:
    """
    Detect the implementing state from Level, Implementing Agency, and
    scheme name / description. Returns state name or 'Central'.
    """
    level = str(row.get("Level", "")).strip().lower()
    if level in ("central", ""):
        # Double-check against agency / name text
        combined = " ".join([
            str(row.get("Ministry", "")),
            str(row.get("Department", "")),
            str(row.get("Implementing Agency", "")),
            str(row.get("Scheme Name", ""))
        ]).lower()
        for state in INDIAN_STATES:
            if state in combined:
                return state.title()
        return "Central"

    # State-level scheme — extract state name
    combined = " ".join([
        str(row.get("Ministry", "")),
        str(row.get("Department", "")),
        str(row.get("Implementing Agency", "")),
        str(row.get("Scheme Name", "")),
        str(row.get("Brief Description", ""))
    ]).lower()

    for state in INDIAN_STATES:
        if state in combined:
            return state.title()

    # Try abbreviations in slug
    slug = str(row.get("Slug", "")).lower()
    for abbr, state in STATE_ABBREVIATIONS.items():
        if f"-{abbr}-" in slug or slug.endswith(f"-{abbr}"):
            return state.title()

    return "State (Unknown)"


# ---------------------------------------------------------------------------
# Category Classifier
# ---------------------------------------------------------------------------
def classify_category(row: dict) -> str:
    """
    Score each category by keyword hits across key fields.
    Returns the highest-scoring category.
    """
    text = " ".join([
        str(row.get("Scheme Name", "")),
        str(row.get("Brief Description", "")),
        str(row.get("Detailed Description", "")),
        str(row.get("Benefits", "")),
        str(row.get("Eligibility", "")),
        str(row.get("Scheme Type", ""))
    ]).lower()

    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[category] += 1

    best = max(scores, key=lambda c: scores[c])
    # Fallback if no keywords matched
    return best if scores[best] > 0 else "Social Welfare"


# ---------------------------------------------------------------------------
# Gender Constraint Extractor
# ---------------------------------------------------------------------------
def extract_gender_constraint(row: dict) -> str:
    """
    Returns 'female_only' if scheme is strictly for women/girls,
    'any' otherwise.
    """
    eligibility = str(row.get("Eligibility", "")).lower()
    scheme_name = str(row.get("Scheme Name", "")).lower()
    description = str(row.get("Brief Description", "")).lower()
    combined = f"{scheme_name} {eligibility} {description}"

    for pattern in FEMALE_ONLY_TRIGGERS:
        if re.search(pattern, combined, re.IGNORECASE):
            return "female_only"
    return "any"


# ---------------------------------------------------------------------------
# Main Ingestion
# ---------------------------------------------------------------------------
def ingest(csv_path: str):
    schemes_enhanced = []
    schemes_simple = []

    print(f"[INFO] Reading CSV: {csv_path}")

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"[INFO] Total rows found: {len(rows)}")

    for i, row in enumerate(rows):
        # --- UI-ready fields ---
        name = clean_readable_text(row.get("Scheme Name", ""))
        slug = str(row.get("Slug", "")).strip()
        brief = clean_readable_text(row.get("Brief Description", ""))
        detailed = clean_readable_text(row.get("Detailed Description", ""))
        benefits = clean_readable_text(row.get("Benefits", ""))
        eligibility = clean_readable_text(row.get("Eligibility", ""))
        process = clean_readable_text(row.get("Application Process", ""))
        url = str(row.get("Application URL", "")).strip()
        image = str(row.get("Image", "")).strip()
        level = clean_readable_text(row.get("Level", ""))
        scheme_type = clean_readable_text(row.get("Scheme Type", ""))
        ministry = clean_readable_text(row.get("Ministry", ""))
        department = clean_readable_text(row.get("Department", ""))
        open_date = str(row.get("Open Date", "")).strip()
        close_date = str(row.get("Close Date", "")).strip()
        agency = clean_readable_text(row.get("Implementing Agency", ""))

        if not name:
            print(f"[WARN] Row {i+1} skipped — empty Scheme Name")
            continue

        # --- Derived fields ---
        state = detect_state(row)
        category = classify_category(row)
        gender = extract_gender_constraint(row)

        # --- NLP corpus (concatenated cleaned text) ---
        nlp_corpus = clean_text_pipeline(
            f"{name} {brief} {detailed} {benefits} {eligibility} {scheme_type}"
        )

        enhanced = {
            "id": i + 1,
            "slug": slug or re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'),
            "name": name,
            "brief_description": brief,
            "detailed_description": detailed,
            "benefits": benefits,
            "eligibility": eligibility,
            "application_process": process,
            "application_url": url,
            "image": image,
            "level": level,
            "scheme_type": scheme_type,
            "ministry": ministry,
            "department": department,
            "open_date": open_date,
            "close_date": close_date,
            "implementing_agency": agency,
            # Derived
            "state": state,
            "category": category,
            "gender_constraint": gender,
            "nlp_corpus": nlp_corpus
        }

        simple = {
            "id": i + 1,
            "name": name,
            "slug": enhanced["slug"],
            "category": category,
            "state": state,
            "level": level,
            "gender_constraint": gender,
            "brief_description": brief,
            "benefits": benefits,
            "eligibility": eligibility,
            "application_url": url,
            "ministry": ministry
        }

        schemes_enhanced.append(enhanced)
        schemes_simple.append(simple)

    # Write outputs
    with open(OUTPUT_ENHANCED, "w", encoding="utf-8") as f:
        json.dump(schemes_enhanced, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_SIMPLE, "w", encoding="utf-8") as f:
        json.dump(schemes_simple, f, ensure_ascii=False, indent=2)

    print(f"\n[SUCCESS] Processed {len(schemes_enhanced)} schemes.")
    print(f"[OUTPUT]  {OUTPUT_ENHANCED}")
    print(f"[OUTPUT]  {OUTPUT_SIMPLE}")

    # Quick sanity check
    cats = {}
    states = {}
    genders = {}
    for s in schemes_enhanced:
        cats[s["category"]] = cats.get(s["category"], 0) + 1
        states[s["state"]] = states.get(s["state"], 0) + 1
        genders[s["gender_constraint"]] = genders.get(s["gender_constraint"], 0) + 1

    print("\n--- Category Distribution ---")
    for k, v in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    print("\n--- State Distribution ---")
    for k, v in sorted(states.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    print("\n--- Gender Constraint ---")
    for k, v in genders.items():
        print(f"  {k}: {v}")

    return schemes_enhanced


if __name__ == "__main__":
    if not os.path.exists(CSV_PATH):
        print(f"[ERROR] CSV not found at: {CSV_PATH}")
        sys.exit(1)
    ingest(CSV_PATH)
