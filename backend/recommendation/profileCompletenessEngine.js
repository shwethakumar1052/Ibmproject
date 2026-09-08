/**
 * GovMatch AI — Profile Completeness Engine (Phase A)
 * Computes a 0–100% completeness score and detects cold-start.
 * Cold-start = completeness < 50% → pipeline relaxes hard filters.
 */

"use strict";

// Each field has a weight (must sum to 100)
const FIELD_WEIGHTS = {
  age:            15,
  gender:         10,
  state:          20,   // highest — state match is critical
  occupation:     15,
  annualIncome:   10,
  education:      10,
  caste:           8,
  goal:            7,   // array — truthy if non-empty
  disability:      2,
  minority:        3,
};

/**
 * Compute profile completeness.
 * @param {object} profile  citizen profile object
 * @returns {{ completeness: number, filledFields: string[], missingFields: string[], isColdStart: boolean }}
 */
function computeProfileCompleteness(profile = {}) {
  let score = 0;
  const filledFields  = [];
  const missingFields = [];

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const val = profile[field];
    const filled = Array.isArray(val)
      ? val.length > 0
      : val !== undefined && val !== null && val !== "" && val !== 0 && val !== false;

    if (filled) {
      score += weight;
      filledFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  const completeness = Math.min(100, Math.round(score));
  return {
    completeness,
    filledFields,
    missingFields,
    isColdStart: completeness < 50,
  };
}

/**
 * Build a profile query string for semantic search.
 * Uses occupation, goal, state, and caste to form a meaningful NLP query.
 */
function buildProfileQuery(profile = {}, userQuery = "") {
  if (userQuery && userQuery.trim().length > 5) return userQuery.trim();

  const parts = [
    profile.occupation,
    Array.isArray(profile.goal) ? profile.goal.join(" ") : profile.goal,
    profile.state !== "Central" ? profile.state : "",
    profile.caste && profile.caste !== "general" ? profile.caste : "",
    profile.gender === "female" ? "women welfare" : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" ") : "government welfare scheme india";
}

/**
 * Generate a short audit ID for the request.
 */
function generateAuditId() {
  const ts   = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `audit_${ts}_${rand}`;
}

module.exports = { computeProfileCompleteness, buildProfileQuery, generateAuditId };
