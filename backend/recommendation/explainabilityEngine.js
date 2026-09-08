/**
 * GovMatch AI — Explainability Engine (XAI v2)
 *
 * Produces human-readable reasoning for each recommendation:
 *   • Confidence Star Rating (★★★★★ Highly Recommended ≥ 85%)
 *   • Machine Reason Codes (STATE_MATCH, GENDER_MATCH, EDUCATION_MATCH, SEMANTIC_MATCH, etc.)
 *   • Natural-language Markdown explanation paragraph
 *   • Coverage funnel metrics
 */

"use strict";

// ── Reason code registry ──────────────────────────────────────────────────────
const REASON_CODES = {
  STATE_MATCH:       "STATE_MATCH",
  GENDER_MATCH:      "GENDER_MATCH",
  AGE_MATCH:         "AGE_MATCH",
  INCOME_MATCH:      "INCOME_MATCH",
  CASTE_MATCH:       "CASTE_MATCH",
  EDUCATION_MATCH:   "EDUCATION_MATCH",
  OCCUPATION_MATCH:  "OCCUPATION_MATCH",
  SEMANTIC_MATCH:    "SEMANTIC_MATCH",
  INTENT_MATCH:      "INTENT_MATCH",
  FLAGSHIP:          "FLAGSHIP_SCHEME",
  CENTRAL_SCHEME:    "CENTRAL_SCHEME",
};

// ── Star rating by score ──────────────────────────────────────────────────────
function buildStarRating(finalScore) {
  const pct = Math.round(finalScore * 100);
  if (pct >= 85) return { stars: "★★★★★", label: "Highly Recommended",  pct };
  if (pct >= 70) return { stars: "★★★★☆", label: "Strongly Recommended", pct };
  if (pct >= 55) return { stars: "★★★☆☆", label: "Good Match",           pct };
  if (pct >= 40) return { stars: "★★☆☆☆", label: "Partial Match",        pct };
  return           { stars: "★☆☆☆☆", label: "Low Match",              pct };
}

// ── Extract the primary financial benefit ─────────────────────────────────────
function extractKeyBenefit(scheme) {
  const text = [scheme.benefits, scheme.brief_description].join(" ");
  const match = text.match(/(?:Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*(lakh|crore|thousand)?/i);
  if (match) {
    const num  = match[1].replace(/,/g, "");
    const unit = (match[2] || "").toLowerCase();
    if (unit === "lakh")     return `₹${num} lakh`;
    if (unit === "crore")    return `₹${num} crore`;
    if (unit === "thousand") return `₹${num} thousand`;
    return `₹${num}`;
  }
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return `${pct[1]}% subsidy/interest`;
  return null;
}

// ── Reason codes from eligibility reasons ────────────────────────────────────
function buildReasonCodes(eligResult, breakdown, schemeIntent, userIntent, scheme) {
  const codes = [];
  const reasons = (eligResult.reasons || []).join(" ").toLowerCase();

  if (reasons.includes("central"))            codes.push(REASON_CODES.CENTRAL_SCHEME);
  if (reasons.includes("state") || reasons.includes("match")) codes.push(REASON_CODES.STATE_MATCH);
  if (reasons.includes("gender") || reasons.includes("female") || reasons.includes("all genders")) codes.push(REASON_CODES.GENDER_MATCH);
  if (reasons.includes("age"))                codes.push(REASON_CODES.AGE_MATCH);
  if (reasons.includes("income"))             codes.push(REASON_CODES.INCOME_MATCH);
  if (reasons.includes("caste") || reasons.includes("category")) codes.push(REASON_CODES.CASTE_MATCH);
  if (reasons.includes("occupation") || reasons.includes("farmer") || reasons.includes("student")) codes.push(REASON_CODES.OCCUPATION_MATCH);
  if (breakdown.eduFactor && breakdown.eduFactor < 1.0) codes.push(REASON_CODES.EDUCATION_MATCH);
  else if (breakdown.eduFactor === 1.0 && reasons.includes("education")) codes.push(REASON_CODES.EDUCATION_MATCH);

  if (breakdown.semantic > 0.15)              codes.push(REASON_CODES.SEMANTIC_MATCH);
  if (schemeIntent === userIntent)            codes.push(REASON_CODES.INTENT_MATCH);

  const slug = (scheme.slug || "").toLowerCase();
  if (["pmjay","pm-kisan","pmmy","pmkvy","pmjdy","pmegp"].includes(slug)) codes.push(REASON_CODES.FLAGSHIP);

  // Deduplicate
  return [...new Set(codes)];
}

// ── Markdown explanation paragraph ───────────────────────────────────────────
function buildMarkdownSummary(scheme, eligResult, reasonCodes, userProfile, finalScore) {
  const parts = [];
  const name  = scheme.name;

  if (reasonCodes.includes("CENTRAL_SCHEME")) {
    parts.push(`**${name}** is a central government scheme available across all of India`);
  } else if (reasonCodes.includes("STATE_MATCH") && userProfile.state) {
    parts.push(`**${name}** is available to residents of **${userProfile.state}**`);
  } else {
    parts.push(`**${name}** is a relevant government scheme`);
  }

  if (reasonCodes.includes("GENDER_MATCH") && userProfile.gender) {
    parts.push(`open to ${userProfile.gender} applicants`);
  }

  if (reasonCodes.includes("INCOME_MATCH") && userProfile.annualIncome) {
    const lakhs = (userProfile.annualIncome / 100000).toFixed(1);
    parts.push(`with your income of ₹${lakhs}L within the eligibility ceiling`);
  }

  if (reasonCodes.includes("CASTE_MATCH") && userProfile.caste && userProfile.caste !== "general") {
    parts.push(`matching the **${userProfile.caste.toUpperCase()}** category requirement`);
  }

  if (reasonCodes.includes("OCCUPATION_MATCH") && userProfile.occupation) {
    parts.push(`specifically targeted at **${userProfile.occupation}s**`);
  }

  if (reasonCodes.includes("SEMANTIC_MATCH")) {
    parts.push(`with a strong semantic match to your query`);
  }

  const sentence = parts.join(", ") + ".";
  const confidence = Math.round(finalScore * 100);
  return `${sentence} Overall match confidence: **${confidence}%**.`;
}

/**
 * Build the full XAI explanation object for a single result.
 */
function buildExplanation(scheme, eligResult, breakdown, finalScore, schemeIntent, userIntent, userProfile = {}) {
  const whyRecommended = [...(eligResult.reasons || [])];

  if (breakdown.semantic > 0.20)
    whyRecommended.push(`Strong semantic match to your query (NLP score: ${(breakdown.semantic / (breakdown.weights?.semantic || 0.35)).toFixed(2)})`);
  if (schemeIntent === userIntent)
    whyRecommended.push(`Directly targets your intent: ${schemeIntent}`);
  if (breakdown.domain && breakdown.domain !== "default")
    whyRecommended.push(`Domain-adaptive scoring applied: ${breakdown.domain} weights`);

  const keyBenefit  = extractKeyBenefit(scheme);
  const missingInfo = [...(eligResult.missing || [])];
  const starRating  = buildStarRating(finalScore);
  const reasonCodes = buildReasonCodes(eligResult, breakdown, schemeIntent, userIntent, scheme);
  const markdownSummary = buildMarkdownSummary(scheme, eligResult, reasonCodes, userProfile, finalScore);

  // Legacy confidence label (kept for UI backwards compat)
  let confidenceLabel;
  if (finalScore >= 0.75)      confidenceLabel = "High Match";
  else if (finalScore >= 0.50) confidenceLabel = "Good Match";
  else if (finalScore >= 0.30) confidenceLabel = "Partial Match";
  else                          confidenceLabel = "Low Match";

  return {
    confidence:       confidenceLabel,
    confidencePct:    `${starRating.label} (${starRating.pct}%)`,
    starRating:       `${starRating.stars} ${starRating.label}`,
    stars:            starRating.stars,
    finalScore:       +finalScore.toFixed(4),
    reasonCodes,
    whyRecommended:   whyRecommended.length ? whyRecommended : ["General eligibility match"],
    keyBenefit:       keyBenefit || scheme.benefits?.split(";")[0]?.trim() || "See scheme details",
    missingInfo,
    markdownSummary,
    scoreBreakdown:   breakdown,
  };
}

module.exports = { buildExplanation, extractKeyBenefit, buildStarRating, buildReasonCodes };
