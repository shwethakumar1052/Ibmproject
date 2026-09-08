/**
 * GovMatch AI — Recommendation Pipeline (v5.1)
 *
 * 5-Phase Hybrid Pipeline:
 *   Phase A: Profile Intelligence (completeness, intent, cache)
 *   Phase B: Deterministic Hard Filtering (eligibility — prunes ~85-90%)
 *   Phase C: Hybrid Scoring (compatibility + NLP vector similarity)
 *   Phase D: Precision & Diversity Filters (threshold gate + diversity cap)
 *   Phase E: Explainability (XAI star ratings, reason codes, markdown)
 */

"use strict";

const axios = require("axios");

const { checkEligibility }                                        = require("./eligibilityEngine");
const { computeCompatibility }                                    = require("./compatibilityEngine");
const { classifySchemeIntent, classifyUserIntent, intentMatchScore } = require("./intentClassifier");
const { buildExplanation }                                        = require("./explainabilityEngine");
const { applyDiversity }                                          = require("./diversityEngine");
const { computeProfileCompleteness, buildProfileQuery, generateAuditId } = require("./profileCompletenessEngine");

const PIPELINE_VERSION = "5.1";
const RANKING_VERSION  = "3.0";

const PYTHON_NLP_URL = process.env.PYTHON_NLP_URL || "http://localhost:5002";
const CACHE_TTL_MS   = 5 * 60 * 1000;   // 5 minutes
const MAX_CACHE_SIZE = 200;

// ── In-memory LRU-style cache ─────────────────────────────────────────────────
const cache = new Map();

function cacheKey(profile, query) {
  // Stable key from sorted profile entries
  const stableProfile = Object.fromEntries(
    Object.entries(profile).sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify({ p: stableProfile, q: query });
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  if (cache.size >= MAX_CACHE_SIZE) {
    cache.delete(cache.keys().next().value); // evict oldest
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Audit log (ring buffer, last 500 entries) ─────────────────────────────────
const auditLog = [];
const MAX_AUDIT = 500;

function logAudit(entry) {
  if (auditLog.length >= MAX_AUDIT) auditLog.shift();
  auditLog.push({ ...entry, timestamp: new Date().toISOString() });
}

// ── Phase C helper: fetch semantic scores from Python NLP ─────────────────────
async function fetchSemanticScores(query, topK = 500) {
  try {
    const res = await axios.post(
      `${PYTHON_NLP_URL}/search`,
      { query, top_k: topK },
      { timeout: 4000 }
    );
    const scoreMap = {};
    for (const r of (res.data.results || [])) {
      scoreMap[r.id] = r.score;
    }
    return scoreMap;
  } catch (err) {
    console.warn("[Pipeline] NLP service unreachable, semantic scores set to 0:", err.message);
    return {};
  }
}

/**
 * Main pipeline entry point — runs all 5 phases.
 *
 * @param {object} userProfile  citizen profile
 * @param {string} query        free-text query
 * @param {Array}  schemes      full schemes_enhanced array
 * @param {number} topN         max results after diversity filter (default 10)
 * @returns {Promise<object>}   full pipeline result including coverageFunnel, XAI, auditId
 */
async function runPipeline(userProfile, query = "", schemes, topN = 10) {
  const auditId = generateAuditId();
  const key     = cacheKey(userProfile, query);
  const cached  = cacheGet(key);

  if (cached) {
    logAudit({ auditId, event: "cache_hit", query, profile: userProfile });
    return cached;
  }

  const t0 = Date.now();

  // ── PHASE A: Profile Intelligence ─────────────────────────────────────────
  const completenessResult = computeProfileCompleteness(userProfile);
  const userIntent         = classifyUserIntent(userProfile, query);
  const searchQuery        = buildProfileQuery(userProfile, query);

  // Cold-start flag — used to relax filters when profile < 50% complete
  const isColdStart = completenessResult.isColdStart;

  // ── PHASE B: Deterministic Hard Filtering ─────────────────────────────────
  // Fetch semantic scores BEFORE the loop for speed
  const semanticMap = await fetchSemanticScores(searchQuery, 500);

  const passed         = [];   // schemes that passed hard filters
  const whyNotRecommended = []; // audit trail of rejections

  for (const scheme of schemes) {
    const eligResult = checkEligibility(scheme, userProfile);

    if (!eligResult.passed && !isColdStart) {
      // Record rejection (only first rejection reason for brevity)
      if (eligResult.missing.length > 0) {
        whyNotRecommended.push({
          scheme_name: scheme.name,
          slug:        scheme.slug,
          reasons:     eligResult.missing.slice(0, 2),
        });
      }
      continue;
    }

    passed.push({ scheme, eligResult });
  }

  // ── PHASE C: Hybrid Scoring ───────────────────────────────────────────────
  const scored = [];

  for (const { scheme, eligResult } of passed) {
    const semanticScore = semanticMap[scheme.slug] || 0;
    const schemeIntent  = classifySchemeIntent(scheme);
    const intentScore   = intentMatchScore(schemeIntent, userIntent);

    const { finalScore, breakdown, passesThreshold } = computeCompatibility(
      scheme,
      eligResult.score,
      semanticScore,
      intentScore,
      userProfile
    );

    // ── PHASE D (threshold gate) — skip below category minimum ─────────────
    if (!passesThreshold) continue;

    const explanation = buildExplanation(
      scheme, eligResult, breakdown, finalScore, schemeIntent, userIntent, userProfile
    );

    scored.push({ scheme, finalScore, explanation, schemeIntent });
  }

  // ── PHASE D: Sort + Diversity cap ─────────────────────────────────────────
  scored.sort((a, b) => b.finalScore - a.finalScore);
  const diverse    = applyDiversity(scored);
  const topResults = diverse.slice(0, topN);

  const elapsed = Date.now() - t0;

  // Coverage funnel (spec Phase E)
  const coverageFunnel = {
    totalSchemes:        schemes.length,
    afterHardFilters:    passed.length,
    afterCompatibility:  scored.length,
    afterIntentMatch:    diverse.length,
    recommended:         topResults.length,
  };

  const output = {
    pipelineVersion:    PIPELINE_VERSION,
    rankingVersion:     RANKING_VERSION,
    auditId,
    userIntent,
    completeness:       completenessResult,
    coverageFunnel,
    recommendations:    topResults,
    whyNotRecommended:  whyNotRecommended.slice(0, 20), // max 20 in response
    elapsedMs:          elapsed,
    count:              topResults.length,
  };

  logAudit({
    auditId,
    event:           "recommendation",
    query,
    profile:         userProfile,
    userIntent,
    isColdStart,
    completeness:    completenessResult.completeness,
    ...coverageFunnel,
    elapsedMs:       elapsed,
  });

  cacheSet(key, output);
  return output;
}

function getAuditLog()  { return [...auditLog].reverse(); }
function getCacheStats() { return { size: cache.size, maxSize: MAX_CACHE_SIZE, ttlMs: CACHE_TTL_MS }; }

module.exports = { runPipeline, getAuditLog, getCacheStats };
