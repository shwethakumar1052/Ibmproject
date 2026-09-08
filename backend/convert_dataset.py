"""
GovMatch AI — Dataset Converter
Converts schemes_enhanced_4430.json (external format) to our internal backend format.
"""

import json
import re
import os
import sys

SRC = r"C:\Users\Shwetha Kumar\Downloads\schemes_enhanced_4430.json"
OUTPUT_ENHANCED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schemes_enhanced.json")
OUTPUT_SIMPLE   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schemes.json")

CATEGORY_KEYWORDS = {
    "Education & Learning": [
        "scholarship", "education", "school", "college", "university", "student",
        "learning", "tuition", "literacy", "skill training", "fellowship", "merit"
    ],
    "Agriculture, Rural & Environment": [
        "farmer", "agriculture", "crop", "irrigation", "kisan", "rural", "soil",
        "fertilizer", "seed", "farm", "animal husbandry", "fishery", "horticulture",
        "watershed", "forest", "environment", "organic", "fasal"
    ],
    "Health & Wellness": [
        "health", "medical", "hospital", "insurance", "ayushman", "treatment",
        "medicine", "nutrition", "sanitation", "maternity", "pregnancy",
        "vaccination", "wellness", "cancer", "tb"
    ],
    "Business & Entrepreneurship": [
        "loan", "startup", "business", "enterprise", "msme", "mudra", "entrepreneur",
        "credit", "subsidy", "investment", "industry", "manufacturing", "svanidhi"
    ],
    "Skills & Employment": [
        "employment", "job", "skill", "training", "apprentice", "internship",
        "vocation", "pmkvy", "labour", "worker", "placement", "livelihood"
    ],
    "Women Empowerment": [
        "women", "girl", "mahila", "female", "beti", "widow", "maternity",
        "self help group", "shg", "sukanya", "samman", "ladli"
    ],
    "Social Welfare": [
        "pension", "disability", "senior citizen", "old age", "bpl", "housing",
        "awas", "toilet", "swachh", "jan dhan", "ration", "food",
        "tribal", "minority", "sc st", "dalit", "backward"
    ]
}

def classify_category(text):
    text = text.lower()
    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in text:
                scores[cat] += 1
    best = max(scores, key=lambda c: scores[c])
    return best if scores[best] > 0 else "Social Welfare"

def get_gender(scheme):
    nlp = scheme.get("nlp") or {}
    es = nlp.get("eligibility_structured") or {}
    gender = es.get("gender") or ""
    name = (scheme.get("scheme_name") or "").lower()
    benefits = (scheme.get("benefits") or "").lower()
    elig_text = ""
    elig = scheme.get("eligibility")
    if isinstance(elig, dict):
        elig_text = (elig.get("text") or "").lower()
    elif isinstance(elig, str):
        elig_text = elig.lower()

    combined = f"{name} {elig_text} {benefits}"
    female_patterns = [r'\bwomen only\b', r'\bonly women\b', r'\bfor women\b',
                       r'\bgirl child\b', r'\bfemale beneficiar', r'\bmahila\b',
                       r'\bwidow\b', r'\bonly for girls\b']
    for pat in female_patterns:
        if re.search(pat, combined, re.IGNORECASE):
            return "female_only"
    if isinstance(gender, str) and "female" in gender.lower():
        return "female_only"
    return "any"

def get_eligibility_text(scheme):
    elig = scheme.get("eligibility")
    if isinstance(elig, dict):
        return (elig.get("text") or "").strip()
    if isinstance(elig, str):
        return elig.strip()
    return ""

def fix_currency(text):
    """Fix garbled currency symbols like â,1 → Rs."""
    if not text:
        return text
    text = re.sub(r'[â€œâ€™â,ï¿½\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]+[\d,]*', lambda m: "Rs.", text)
    text = re.sub(r'â[^a-zA-Z\s]', 'Rs.', text)
    return text

def convert():
    print(f"[INFO] Reading: {SRC}")
    with open(SRC, encoding="utf-8") as f:
        raw = json.load(f)
    print(f"[INFO] Total schemes in source: {len(raw)}")

    enhanced = []
    simple = []

    for i, s in enumerate(raw):
        name = (s.get("scheme_name") or "").strip()
        if not name:
            continue

        slug = s.get("slug") or re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        brief = fix_currency(s.get("details") or "")
        benefits = fix_currency(s.get("benefits") or "")
        eligibility = fix_currency(get_eligibility_text(s))
        url = (s.get("finalResolvedUrl") or s.get("applicationUrl") or "").strip()
        level = (s.get("level") or "Central").strip()
        state = (s.get("state") or "Central").strip()
        if state in ("All India", "", "null", "None"):
            state = "Central"

        nlp = s.get("nlp") or {}
        es = nlp.get("eligibility_structured") or {}
        tags = nlp.get("structured_tags") or {}

        ministry = ""
        category_text = s.get("standard_category") or s.get("schemeCategory") or ""

        # Classify category using our keyword system
        combined_text = f"{name} {brief} {benefits} {eligibility} {category_text}"
        category = classify_category(combined_text)
        gender = get_gender(s)

        # NLP corpus
        nlp_corpus = re.sub(r'\s+', ' ', f"{name} {brief} {benefits} {eligibility}").lower().strip()

        e = {
            "id": i + 1,
            "slug": slug,
            "name": name,
            "brief_description": brief,
            "detailed_description": brief,
            "benefits": benefits,
            "eligibility": eligibility,
            "application_process": "",
            "application_url": url,
            "image": "",
            "level": level,
            "scheme_type": category_text,
            "ministry": ministry,
            "department": "",
            "open_date": "",
            "close_date": "",
            "implementing_agency": "",
            "state": state,
            "category": category,
            "gender_constraint": gender,
            "nlp_corpus": nlp_corpus,
            # Extra NLP fields preserved
            "min_age": es.get("min_age"),
            "max_age": es.get("max_age"),
            "max_income": es.get("income_limit") or nlp.get("max_income"),
            "occupation": es.get("occupation"),
            "tags": tags
        }

        sm = {
            "id": i + 1,
            "name": name,
            "slug": slug,
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

        enhanced.append(e)
        simple.append(sm)

    with open(OUTPUT_ENHANCED, "w", encoding="utf-8") as f:
        json.dump(enhanced, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_SIMPLE, "w", encoding="utf-8") as f:
        json.dump(simple, f, ensure_ascii=False, indent=2)

    print(f"\n[SUCCESS] Converted {len(enhanced)} schemes.")

    # Stats
    cats, states, genders = {}, {}, {}
    for sc in enhanced:
        cats[sc["category"]] = cats.get(sc["category"], 0) + 1
        states[sc["state"]] = states.get(sc["state"], 0) + 1
        genders[sc["gender_constraint"]] = genders.get(sc["gender_constraint"], 0) + 1

    print("\n--- Category Distribution ---")
    for k, v in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    print("\n--- Top 10 States ---")
    for k, v in sorted(states.items(), key=lambda x: -x[1])[:10]:
        print(f"  {k}: {v}")

    print("\n--- Gender ---")
    for k, v in genders.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    if not os.path.exists(SRC):
        print(f"[ERROR] Source not found: {SRC}")
        sys.exit(1)
    convert()
