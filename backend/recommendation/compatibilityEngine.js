/**
 * GovMatch AI — Compatibility Engine (v2)
 *
 * Scoring formula:
 *   FinalScore = (W_elig × eligScore) + (W_sem × semanticScore × intentSim) + (W_govt × govtScore)
 *
 * Adaptive Domain Weights:
 *   Scholarships  → 65% Eligibility, 35% Semantic
 *   Pensions      → 85% Eligibility, 15% Semantic
 *   Subsidies     → 80% Eligibility, 20% Semantic
 *   Loans         → 80% Eligibility, 20% Semantic
 *   Default       → 40% Eligibility, 35% Semantic, 15% Intent, 10% Priority
 *
 * Education Cross-Match Matrix:
 *   Engineering → Science: 0.6 partial credit
 */

"use strict";

// ── Flagship scheme priority boost ──────────────────────────────────────────
const FLAGSHIP_SLUGS = new Set([
  "pmjay", "pm-kisan", "pmmy", "pmkvy", "pmjdy", "pmegp",
  "sukanya-samriddhi", "bbbp", "standup-india", "pmfby",
  "nsp", "ugc-scholarship", "aicte-scholarship",
]);

// Flagship provider prefixes (spec: max 2 per prefix)
const FLAGSHIP_PREFIXES = ["ugc", "aicte", "nsp", "pm-kisan"];

function govtPriorityScore(scheme) {
  const slug = (scheme.slug || "").toLowerCase();
  if (FLAGSHIP_SLUGS.has(slug)) return 1.0;
  if (FLAGSHIP_PREFIXES.some(p => slug.startsWith(p))) return 0.85;

  if (scheme.open_date) {
    try {
      const parts  = scheme.open_date.split("-");
      const opened = parts.length === 3
        ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        : new Date(scheme.open_date);
      const ageYears = (Date.now() - opened.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageYears < 2) return 0.9;
      if (ageYears < 5) return 0.75;
    } catch (_) { /* ignore */ }
  }
  return 0.6;
}

// ── Adaptive weight table by scheme domain ───────────────────────────────────
const DOMAIN_WEIGHTS = {
  scholarship: { elig: 0.65, sem: 0.30, intent: 0.05, govt: 0.00 },
  pension:     { elig: 0.85, sem: 0.10, intent: 0.05, govt: 0.00 },
  subsidy:     { elig: 0.80, sem: 0.15, intent: 0.05, govt: 0.00 },
  loan:        { elig: 0.80, sem: 0.15, intent: 0.05, govt: 0.00 },
  default:     { elig: 0.40, sem: 0.35, intent: 0.15, govt: 0.10 },
};

const DOMAIN_KEYWORDS = {
  scholarship: ["scholarship", "stipend", "fellowship", "merit", "tuition", "education fund"],
  pension:     ["pension", "old age", "senior citizen", "annuity", "retirement"],
  subsidy:     ["subsidy", "subvention", "grant", "rebate", "discount"],
  loan:        ["loan", "credit", "mudra", "kcc", "finance", "capital"],
};

function detectSchemeDomain(scheme) {
  const text = [scheme.name, scheme.brief_description, scheme.category, scheme.scheme_type]
    .join(" ").toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return domain;
  }
  return "default";
}

// ── Education cross-match matrix ─────────────────────────────────────────────
// partial match factors between education streams
const EDU_CROSS_MATCH = {
  "engineering":  { "science": 0.6, "technology": 0.9, "engineering": 1.0 },
  "science":      { "engineering": 0.6, "science": 1.0, "technology": 0.7 },
  "arts":         { "arts": 1.0, "humanities": 0.9, "social": 0.7 },
  "commerce":     { "commerce": 1.0, "business": 0.8, "management": 0.7 },
  "medical":      { "medical": 1.0, "health": 0.8, "nursing": 0.7 },
};

/**
 * Returns a 0–1 education compatibility score between user and scheme.
 * If no education mismatch is detectable, returns 1.0 (no penalty).
 */
function educationCompatibilityScore(userEducation = "", schemeEligibility = "") {
  if (!userEducation) return 1.0;
  const userEdu  = userEducation.toLowerCase();
  const scheText = schemeEligibility.toLowerCase();

  // Find the user's stream in the cross-match matrix
  for (const [stream, crossMap] of Object.entries(EDU_CROSS_MATCH)) {
    if (userEdu.includes(stream)) {
      // Check if scheme mentions a specific stream
      for (const [targetStream, factor] of Object.entries(crossMap)) {
        if (scheText.includes(targetStream)) return factor;
      }
      // Scheme doesn't specify a stream — no penalty
      return 1.0;
    }
  }
  return 1.0;
}

// ── Category threshold gates (spec Phase D) ──────────────────────────────────
const CATEGORY_THRESHOLDS = {
  "Research":    0.70,
  "Scholarship": 0.65,
  "Loans":       0.60,
  "default":     0.00,   // no gate for other categories
};

function getCategoryThreshold(scheme) {
  const cat = (scheme.category || "").toLowerCase();
  if (cat.includes("research"))    return CATEGORY_THRESHOLDS["Research"];
  if (cat.includes("scholarship") || cat.includes("education")) return CATEGORY_THRESHOLDS["Scholarship"];
  if (cat.includes("loan") || cat.includes("credit")) return CATEGORY_THRESHOLDS["Loans"];
  return CATEGORY_THRESHOLDS["default"];
}

/**
 * Compute the final weighted compatibility score for a scheme.
 *
 * @param {object} scheme
 * @param {number} demographicScore  0–1  from eligibilityEngine
 * @param {number} semanticScore     0–1  from NLP cosine similarity
 * @param {number} intentScore       0–1  from intentClassifier
 * @param {object} userProfile       citizen profile (for education cross-match)
 * @returns {{ finalScore, breakdown, domain, passesThreshold }}
 */
function computeCompatibility(scheme, demographicScore, semanticScore, intentScore, userProfile = {}) {
  const domain   = detectSchemeDomain(scheme);
  const weights  = DOMAIN_WEIGHTS[domain] || DOMAIN_WEIGHTS.default;
  const govtScore = govtPriorityScore(scheme);

  // Education cross-match adjustment
  const eduFactor = educationCompatibilityScore(
    userProfile.education || "",
    scheme.eligibility || ""
  );

  // Intent × semantic combined (semantic amplified by intent alignment).
  // Floor at 0.70 × raw semantic to prevent intent mismatch from completely
  // suppressing semantically strong cross-category results (e.g. a farmer
  // searching for "housing" should still see housing schemes).
  const semIntentCombined = Math.max(
    semanticScore * (0.5 + 0.5 * intentScore),
    semanticScore * 0.70
  );

  const finalScore =
    weights.elig   * demographicScore  +
    weights.sem    * semIntentCombined * eduFactor +
    weights.intent * intentScore       +
    weights.govt   * govtScore;

  const clampedScore = Math.min(1, Math.max(0, finalScore));

  // Threshold gate: bypass when NLP is unavailable (semanticScore=0) or
  // profile is cold-start — avoids blocking valid schemes on missing signals.
  const rawThreshold     = getCategoryThreshold(scheme);
  const effectiveThreshold = semanticScore === 0 ? Math.min(rawThreshold, 0.40) : rawThreshold;
  const passesThreshold  = clampedScore >= effectiveThreshold;

  return {
    finalScore:       clampedScore,
    passesThreshold,
    domain,
    breakdown: {
      demographic:    +(demographicScore  * weights.elig).toFixed(4),
      semantic:       +(semIntentCombined * weights.sem * eduFactor).toFixed(4),
      intent:         +(intentScore       * weights.intent).toFixed(4),
      govtPriority:   +(govtScore         * weights.govt).toFixed(4),
      eduFactor:      +eduFactor.toFixed(4),
      domain,
      weights: {
        demographic:  weights.elig,
        semantic:     weights.sem,
        intent:       weights.intent,
        govtPriority: weights.govt,
      },
    }
  };
}

module.exports = {
  computeCompatibility,
  govtPriorityScore,
  detectSchemeDomain,
  educationCompatibilityScore,
  getCategoryThreshold,
};
