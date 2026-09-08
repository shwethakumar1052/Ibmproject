/**
 * GovMatch AI — Intent Classifier
 * Maps user occupation + query terms to a scheme's target intent.
 * Prevents cross-intent mismatches (e.g. student getting farm subsidies).
 */

const INTENT_PROFILES = {
  education: {
    schemeKeywords:   ["scholarship", "education", "school", "college", "student", "learning", "literacy", "breakfast", "stipend", "merit"],
    userOccupations:  ["student"],
    userQueryTerms:   ["scholarship", "study", "college", "school", "fees", "tuition", "education"]
  },
  agriculture: {
    schemeKeywords:   ["farmer", "kisan", "crop", "agriculture", "irrigation", "seed", "fertilizer", "horticulture", "fasal", "gramin", "krishi"],
    userOccupations:  ["farmer"],
    userQueryTerms:   ["farm", "crop", "kisan", "agriculture", "irrigation", "seeds", "gramin"]
  },
  business: {
    schemeKeywords:   ["entrepreneur", "startup", "msme", "loan", "credit", "enterprise", "mudra", "stand up", "svanidhi", "udyam"],
    userOccupations:  ["entrepreneur", "self-employed", "business owner"],
    userQueryTerms:   ["loan", "business", "startup", "enterprise", "msme", "capital", "udyam"]
  },
  health: {
    schemeKeywords:   ["health", "medical", "hospital", "ayushman", "insurance", "medicine", "treatment", "nhm", "swasthya"],
    userOccupations:  [],   // health applies across occupations
    userQueryTerms:   ["health", "hospital", "medical", "insurance", "treatment", "medicine"]
  },
  employment: {
    schemeKeywords:   ["employment", "skill", "training", "job", "pmkvy", "apprentice", "livelihood", "vocational", "shramik", "rozgar"],
    userOccupations:  ["unemployed", "daily wage worker"],
    userQueryTerms:   ["job", "skill", "training", "employment", "work", "career", "rozgar", "shramik"]
  },
  women: {
    schemeKeywords:   ["mahila", "women", "beti", "girl", "sukanya", "maternity", "widow", "female", "stree", "kishori"],
    userOccupations:  [],
    userQueryTerms:   ["women", "girl", "mahila", "beti", "female", "stree"]
  },
  // NEW: disability intent — catches Divyangjan/PWD schemes
  disability: {
    schemeKeywords:   ["divyang", "disability", "handicap", "differently abled", "pwd", "physically challenged", "blind", "deaf", "specially abled"],
    userOccupations:  [],
    userQueryTerms:   ["disability", "divyang", "handicap", "pwd", "blind", "deaf", "specially abled"]
  },
  // NEW: senior citizen intent
  senior: {
    schemeKeywords:   ["senior citizen", "old age", "elderly", "pensioner", "vridha", "vriddha", "60 years", "above 60"],
    userOccupations:  ["retired", "pensioner"],
    userQueryTerms:   ["senior", "old age", "elderly", "pension", "retired", "vridha"]
  },
  welfare: {
    schemeKeywords:   ["pension", "housing", "awas", "ration", "bpl", "jan dhan", "antyodaya", "yuva"],
    userOccupations:  [],
    userQueryTerms:   ["pension", "house", "housing", "food", "ration", "bpl", "yuva"]
  }
};

/**
 * Derive the dominant intent category of a scheme.
 */
function classifySchemeIntent(scheme) {
  const text = [
    scheme.name, scheme.brief_description,
    scheme.category, scheme.scheme_type, scheme.eligibility
  ].join(" ").toLowerCase();

  let best = "welfare", bestScore = 0;
  for (const [intent, profile] of Object.entries(INTENT_PROFILES)) {
    const score = profile.schemeKeywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return best;
}

/**
 * Derive the dominant intent of a user profile + query.
 */
function classifyUserIntent(profile, query = "") {
  const occ      = (profile.occupation || "").toLowerCase();
  const queryLow = query.toLowerCase();
  const combined = `${occ} ${queryLow}`;

  // Auto-boost disability / senior from profile flags (not just text)
  const autoBoosts = {};
  if (profile.disability)          autoBoosts.disability = 3;
  if (profile.isWidow)             autoBoosts.women      = 2;
  if (parseInt(profile.age) >= 60) autoBoosts.senior     = 3;
  if (profile.bplCard)             autoBoosts.welfare    = 1;

  let best = "welfare", bestScore = 0;
  for (const [intent, prof] of Object.entries(INTENT_PROFILES)) {
    let score = autoBoosts[intent] || 0;
    score += prof.userOccupations.filter(o => combined.includes(o)).length * 2;
    score += prof.userQueryTerms.filter(t => combined.includes(t)).length;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return best;
}

/**
 * Compute intent match score (0–1).
 * Full match = 1.0; compatible intents = 0.6; mismatch = 0.1.
 */
const COMPATIBLE_INTENTS = {
  education:   ["education", "welfare", "women", "employment"],
  agriculture: ["agriculture", "welfare", "employment", "business"],
  business:    ["business", "employment", "welfare"],
  health:      ["health", "welfare", "women", "disability", "senior"],
  employment:  ["employment", "business", "welfare", "education"],
  women:       ["women", "education", "health", "welfare", "disability"],
  disability:  ["disability", "health", "welfare", "women", "employment"],
  senior:      ["senior", "welfare", "health", "pension"],
  welfare:     ["welfare", "health", "employment", "education", "agriculture", "business", "women", "disability", "senior"]
};

function intentMatchScore(schemeIntent, userIntent) {
  if (schemeIntent === userIntent) return 1.0;
  if ((COMPATIBLE_INTENTS[userIntent] || []).includes(schemeIntent)) return 0.6;
  return 0.1;   // genuine mismatch — student getting farm subsidies etc.
}

module.exports = { classifySchemeIntent, classifyUserIntent, intentMatchScore };
