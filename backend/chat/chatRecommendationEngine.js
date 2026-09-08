/**
 * GovMatch AI — Chat Recommendation Engine
 * Retrieves verified scheme records from the local dataset via the Python
 * semantic search service (with keyword fallback), then formats them as
 * structured "Ground Truth" context blocks for the LLM system prompt.
 *
 * This eliminates hallucinations: the LLM is only allowed to reference
 * scheme data that has been verified against schemes_enhanced.json.
 */

"use strict";

const axios = require("axios");
const fs    = require("fs");
const path  = require("path");

// Lazy-loaded schemes cache (refreshed when server reloads)
let _schemesCache = null;

function getSchemesEnhanced() {
  if (_schemesCache) return _schemesCache;
  try {
    const p = path.join(__dirname, "..", "schemes_enhanced.json");
    _schemesCache = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (_) {
    _schemesCache = [];
  }
  return _schemesCache;
}

// Allow server to invalidate cache after hot-reload
function invalidateCache() { _schemesCache = null; }

// ── Keyword fallback search (when NLP service is unavailable) ────────────────
function keywordSearch(query, topK = 5) {
  const schemes = getSchemesEnhanced();
  const tokens  = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!tokens.length) return schemes.slice(0, topK);

  const scored = schemes.map(s => {
    const corpus = (s.nlp_corpus || `${s.name} ${s.brief_description} ${s.benefits} ${s.eligibility}`).toLowerCase();
    const hits   = tokens.filter(t => corpus.includes(t)).length;
    return { scheme: s, score: hits / tokens.length };
  });

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(x => x.scheme);
}

// ── Profile-aware keyword boost ──────────────────────────────────────────────
function applyProfileBoost(schemes, profile = {}) {
  if (!profile || !Object.keys(profile).length) return schemes;

  return schemes.map(s => {
    let boost = 0;
    if (profile.state && s.state !== "Central" && s.state === profile.state) boost += 2;
    if (profile.gender === "female" && s.gender_constraint === "female_only") boost += 2;
    if (profile.caste && s.eligibility?.toLowerCase().includes(profile.caste.toLowerCase())) boost += 1;
    if (profile.occupation && s.category?.toLowerCase().includes(profile.occupation.toLowerCase())) boost += 1;
    return { scheme: s, boost };
  })
  .sort((a, b) => b.boost - a.boost)
  .map(x => x.scheme);
}

// ── Main retrieval function ──────────────────────────────────────────────────
/**
 * Retrieve top-K schemes relevant to a query + citizen profile.
 * Tries Python NLP service first; falls back to keyword search.
 *
 * @param {string} query        optimised search query
 * @param {object} profile      citizen profile object
 * @param {string} nlpUrl       base URL of Python NLP service
 * @param {number} topK         how many schemes to retrieve (default 5)
 * @returns {Promise<{ schemes: object[], source: "semantic"|"keyword" }>}
 */
async function retrieveContextSchemes(query, profile = {}, nlpUrl = "http://localhost:5002", topK = 5) {
  const schemes = getSchemesEnhanced();
  let source = "keyword";
  let results = [];

  try {
    const res = await axios.post(
      `${nlpUrl}/search`,
      { query, top_k: topK },
      { timeout: 3000 }
    );

    const hits = res.data.results || [];
    results = hits
      .map(r => schemes.find(s => s.slug === r.id || s.id === r.id))
      .filter(Boolean);

    if (results.length > 0) source = "semantic";
  } catch (_) {
    // NLP service unavailable — use keyword fallback
  }

  if (!results.length) {
    results = keywordSearch(query, topK);
  }

  // Apply profile-aware boosts and de-duplicate
  const seen = new Set();
  const deduped = applyProfileBoost(results, profile).filter(s => {
    if (seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  }).slice(0, topK);

  return { schemes: deduped, source };
}

// ── System prompt context builder ────────────────────────────────────────────
/**
 * Format retrieved schemes into a structured Ground Truth block
 * for injection into the LLM system prompt.
 *
 * @param {object[]} schemes  array of scheme objects from schemes_enhanced.json
 * @returns {string}          formatted context string
 */
function buildGroundTruthBlock(schemes) {
  if (!schemes.length) return "";

  const lines = schemes.map((s, i) => [
    `[Scheme ${i + 1}]`,
    `  Name       : ${s.name}`,
    `  Category   : ${s.category}`,
    `  Level      : ${s.level} | State: ${s.state}`,
    `  Ministry   : ${s.ministry || "—"}`,
    `  Description: ${s.brief_description}`,
    `  Benefits   : ${s.benefits}`,
    `  Eligibility: ${s.eligibility}`,
    `  Apply At   : ${s.application_url || "N/A"}`,
  ].join("\n"));

  return `\n\n=== VERIFIED SCHEME DATABASE (Ground Truth — cite only these) ===\n${lines.join("\n\n")}\n===END===`;
}

/**
 * Return a clean minimal array of scheme objects safe to send to the frontend
 * (subset of fields — avoids sending full nlp_corpus / raw text blobs).
 *
 * @param {object[]} schemes
 * @returns {object[]}
 */
function toFrontendSchemes(schemes) {
  return schemes.map(s => ({
    id:                s.slug,
    slug:              s.slug,
    name:              s.name,
    brief_description: s.brief_description,
    benefits:          s.benefits,
    eligibility:       s.eligibility,
    category:          s.category,
    level:             s.level,
    state:             s.state,
    ministry:          s.ministry,
    application_url:   s.application_url,
    gender_constraint: s.gender_constraint,
  }));
}

module.exports = {
  retrieveContextSchemes,
  buildGroundTruthBlock,
  toFrontendSchemes,
  invalidateCache,
};
