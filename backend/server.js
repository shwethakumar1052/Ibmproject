/**
 * GovMatch AI — Express Server
 * Port 5001 | REST API + WebSocket
 */

require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const http       = require("http");
const { WebSocketServer } = require("ws");
const axios      = require("axios");
const cron       = require("node-cron");
const translate  = require("google-translate-api-x");
const fs         = require("fs");
const path       = require("path");

const { runPipeline, getAuditLog, getCacheStats } = require("./recommendation/recommendationPipeline");
const { classifyIntent, buildSearchQuery }         = require("./chat/chatIntentEngine");
const { retrieveContextSchemes, buildGroundTruthBlock, toFrontendSchemes, invalidateCache: invalidateSchemeCache } = require("./chat/chatRecommendationEngine");
const { extractProfileSignals, buildDetectionSummary } = require("./chat/chatProfileManager");
const {
  getConversationalResponse,
  isConversationalOnly,
  buildSchemeAnswer,
  getUnknownResponse,
  buildSystemPrompt,
} = require("./chat/chatResponseComposer");
const notifService    = require("./notifications/notificationService");
const notifRoutes     = require("./notifications/notificationRoutes");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT            = process.env.PORT            || 5001;
const OPENROUTER_KEY  = process.env.OPENROUTER_API_KEY || "";
const PYTHON_NLP_URL  = process.env.PYTHON_NLP_URL  || "http://localhost:5002";

const SCHEMES_ENHANCED_PATH = path.join(__dirname, "schemes_enhanced.json");
const SCHEMES_SIMPLE_PATH   = path.join(__dirname, "schemes.json");
const OVERRIDES_PATH        = path.join(__dirname, "admin_overrides.json");

// ---------------------------------------------------------------------------
// Load Data
// ---------------------------------------------------------------------------
let SCHEMES_ENHANCED = [];
let SCHEMES_SIMPLE   = [];

function loadSchemes() {
  try {
    SCHEMES_ENHANCED = JSON.parse(fs.readFileSync(SCHEMES_ENHANCED_PATH, "utf-8"));
    SCHEMES_SIMPLE   = JSON.parse(fs.readFileSync(SCHEMES_SIMPLE_PATH,   "utf-8"));
    console.log(`[Server] Loaded ${SCHEMES_ENHANCED.length} schemes.`);
  } catch (e) {
    console.error("[Server] Could not load schemes JSON:", e.message);
  }
}
loadSchemes();

function loadOverrides() {
  try { return JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8")); }
  catch (_) { return { boostSlugs: [], hideSlugs: [] }; }
}

// ---------------------------------------------------------------------------
// Translation Cache
// ---------------------------------------------------------------------------
const translateCache = new Map();

async function translateText(text, targetLang) {
  const key = `${targetLang}::${text}`;
  if (translateCache.has(key)) return translateCache.get(key);
  const result = await translate(text, { to: targetLang });
  const translated = result.text || text;
  translateCache.set(key, translated);
  return translated;
}

// ---------------------------------------------------------------------------
// App + HTTP + WebSocket
// ---------------------------------------------------------------------------
const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Mount notification REST routes
app.use("/api", notifRoutes);

// Init notification WebSocket server on /ws/notifications
notifService.initWebSocketServer(server);

// Legacy broadcast helper (kept for admin/cron uses)
const { WebSocketServer: _WSSLegacy } = require("ws");
const wss = new _WSSLegacy({ server, path: "/ws/legacy" });
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "welcome", message: "GovMatch AI connected." }));
  ws.on("close", () => {});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function applyOverrides(schemes) {
  const { boostSlugs = [], hideSlugs = [] } = loadOverrides();
  const hidden   = schemes.filter(s => !hideSlugs.includes(s.slug));
  const boosted  = hidden.filter(s =>  boostSlugs.includes(s.slug));
  const rest     = hidden.filter(s => !boostSlugs.includes(s.slug));
  return [...boosted, ...rest];
}

function paginate(arr, page = 1, limit = 20) {
  const total = arr.length;
  const pages = Math.ceil(total / limit);
  const data  = arr.slice((page - 1) * limit, page * limit);
  return { data, pagination: { page, limit, total, pages } };
}

// ---------------------------------------------------------------------------
// ── Routes: Schemes ─────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

// GET /api/schemes — filtered + paginated
app.get("/api/schemes", (req, res) => {
  const { category, state, search, level, page = 1, limit = 20 } = req.query;
  let results = applyOverrides(SCHEMES_SIMPLE);

  if (category) results = results.filter(s => s.category?.toLowerCase() === category.toLowerCase());
  if (state)    results = results.filter(s =>
    s.state?.toLowerCase() === state.toLowerCase() || s.level?.toLowerCase() === "central"
  );
  if (level)    results = results.filter(s => s.level?.toLowerCase() === level.toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.brief_description?.toLowerCase().includes(q) ||
      s.ministry?.toLowerCase().includes(q)
    );
  }

  res.json(paginate(results, parseInt(page), parseInt(limit)));
});

// GET /api/schemes/categories — unique categories
app.get("/api/schemes/categories", (req, res) => {
  const cats = [...new Set(SCHEMES_SIMPLE.map(s => s.category).filter(Boolean))].sort();
  res.json(cats);
});

// GET /api/schemes/states — unique states
app.get("/api/schemes/states", (req, res) => {
  const states = [...new Set(SCHEMES_SIMPLE.map(s => s.state).filter(Boolean))].sort();
  res.json(states);
});

// GET /api/schemes/:id — single scheme by slug or numeric id
app.get("/api/schemes/:id", (req, res) => {
  const { id } = req.params;
  const scheme = SCHEMES_ENHANCED.find(
    s => s.slug === id || String(s.id) === id
  );
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });
  res.json(scheme);
});

// ---------------------------------------------------------------------------
// ── Routes: Recommendation ──────────────────────────────────────────────────
// ---------------------------------------------------------------------------

app.post("/api/recommend", async (req, res) => {
  const { profile = {}, query = "", topN = 10 } = req.body;

  if (!SCHEMES_ENHANCED.length)
    return res.status(503).json({ error: "Schemes data not loaded." });

  try {
    const output = await runPipeline(profile, query, SCHEMES_ENHANCED, parseInt(topN));
    const recs   = output.recommendations || [];

    // Fire real-time notification via WebSocket
    if (recs.length > 0) {
      const top = recs[0].scheme;
      notifService.createNotification({
        type:       notifService.TYPES.ELIGIBILITY_UPDATED,
        title:      `🎯 ${recs.length} Scheme${recs.length > 1 ? "s" : ""} Matched`,
        message:    `Top match: ${top.name} — click to view your personalised results.`,
        schemeId:   top.slug,
        schemeName: top.name,
        priority:   recs.length >= 5 ? "high" : "medium",
      });
    }

    res.json({
      // v5.1 spec fields
      pipelineVersion:   output.pipelineVersion,
      rankingVersion:    output.rankingVersion,
      auditId:           output.auditId,
      userIntent:        output.userIntent,
      completeness:      output.completeness,
      coverageFunnel:    output.coverageFunnel,
      whyNotRecommended: output.whyNotRecommended,
      elapsedMs:         output.elapsedMs,
      // frontend-facing fields
      query,
      profile,
      count:             recs.length,
      recommendations:   recs.map(r => ({
        scheme:      r.scheme,
        finalScore:  r.finalScore,
        explanation: r.explanation,
        intent:      r.schemeIntent,
      })),
    });
  } catch (err) {
    console.error("[/api/recommend] Error:", err.message);
    res.status(500).json({ error: "Recommendation pipeline failed.", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// ── Routes: Translation ─────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

app.post("/api/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang)
    return res.status(400).json({ error: "text and targetLang are required." });
  try {
    const translated = await translateText(text, targetLang);
    res.json({ original: text, translated, targetLang });
  } catch (err) {
    console.error("[/api/translate]", err.message);
    res.status(500).json({ error: "Translation failed.", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// ── Routes: Chat (LLM via OpenRouter) ───────────────────────────────────────
// ---------------------------------------------------------------------------

app.post("/api/chat", async (req, res) => {
  const { message, profile = {}, language = "en", history = [] } = req.body;
  if (!message) return res.status(400).json({ error: "message is required." });

  const lang = (language || "en").slice(0, 2);  // normalise to 2-char code
  const langLabel = { en: "English", hi: "Hindi", kn: "Kannada", ta: "Tamil", te: "Telugu", mr: "Marathi" }[lang] || "English";

  // ── Step 1: Classify intent + extract demographic signals ──────────────────
  const intentResult     = classifyIntent(message);
  const searchQuery      = buildSearchQuery(message, intentResult, profile);
  const profileSignals   = extractProfileSignals(message);
  const detectionSummary = buildDetectionSummary(profileSignals);

  // ── Step 2: Short-circuit purely conversational intents (no LLM, no RAG) ──
  if (isConversationalOnly(intentResult.intent)) {
    const reply = getConversationalResponse(intentResult.intent, lang);
    return res.json({
      reply,
      schemes:          [],
      source:           "conversational",
      intent:           intentResult.intent,
      extractedProfile: Object.keys(profileSignals).length ? profileSignals : null,
      detectionSummary,
    });
  }

  // ── Step 3: Retrieve verified scheme context (RAG Ground Truth) ───────────
  const { schemes: contextSchemes, source: ragSource } = await retrieveContextSchemes(
    searchQuery, profile, PYTHON_NLP_URL, 5
  );
  const groundTruth   = buildGroundTruthBlock(contextSchemes);
  const frontendCards = toFrontendSchemes(contextSchemes);

  // ── Step 4: No LLM key — use intent-aware composer for rich fallback ───────
  if (!OPENROUTER_KEY) {
    const reply = buildSchemeAnswer(intentResult.intent, contextSchemes, lang);
    return res.json({
      reply,
      schemes:          frontendCards,
      source:           "fallback",
      ragSource,
      intent:           intentResult.intent,
      extractedProfile: Object.keys(profileSignals).length ? profileSignals : null,
      detectionSummary,
    });
  }

  // ── Step 5: Build rich, context-aware system prompt ────────────────────────
  const systemPrompt = buildSystemPrompt({
    langLabel,
    intentResult,
    history,
    profile,
    groundTruth,
  });

  const llmMessages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),   // last 10 turns — longer context window for follow-ups
    { role: "user",   content: message },
  ];

  // ── Step 6: Call OpenRouter LLM ────────────────────────────────────────────
  try {
    const llmRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model:       "google/gemini-flash-1.5",
        messages:    llmMessages,
        max_tokens:  700,
        temperature: 0.25,  // lower = more factual, less hallucination
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer":  "https://govmatch.ai",
          "X-Title":       "GovMatch AI",
        },
        timeout: 20000,
      }
    );

    const reply = llmRes.data.choices?.[0]?.message?.content
      || getUnknownResponse(lang);

    res.json({
      reply,
      schemes:          frontendCards,
      source:           "openrouter",
      ragSource,
      intent:           intentResult.intent,
      extractedProfile: Object.keys(profileSignals).length ? profileSignals : null,
      detectionSummary,
    });
  } catch (err) {
    console.error("[/api/chat]", err.message);
    // Graceful degradation — composer builds a structured answer from RAG data
    const fallbackReply = buildSchemeAnswer(intentResult.intent, contextSchemes, lang)
      || getUnknownResponse(lang);
    res.json({
      reply:            fallbackReply,
      schemes:          frontendCards,
      source:           "error_fallback",
      ragSource,
      intent:           intentResult.intent,
      extractedProfile: Object.keys(profileSignals).length ? profileSignals : null,
      detectionSummary,
    });
  }
});

// ---------------------------------------------------------------------------
// ── Admin Routes ────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

// GET /api/admin/analytics
app.get("/api/admin/analytics", (req, res) => {
  const cats = {}, states = {}, genders = {};
  for (const s of SCHEMES_ENHANCED) {
    cats[s.category]   = (cats[s.category]   || 0) + 1;
    states[s.state]    = (states[s.state]    || 0) + 1;
    genders[s.gender_constraint] = (genders[s.gender_constraint] || 0) + 1;
  }
  res.json({
    totalSchemes:       SCHEMES_ENHANCED.length,
    categoryBreakdown:  cats,
    stateBreakdown:     states,
    genderConstraints:  genders,
    pipeline:           { cache: getCacheStats() },
    recentAuditLog:     getAuditLog().slice(0, 20)
  });
});

// GET /api/admin/audit
app.get("/api/admin/audit", (req, res) => {
  res.json(getAuditLog());
});

// GET /api/admin/overrides
app.get("/api/admin/overrides", (req, res) => {
  res.json(loadOverrides());
});

// POST /api/admin/overrides
app.post("/api/admin/overrides", (req, res) => {
  const { boostSlugs = [], hideSlugs = [] } = req.body;
  const data = { boostSlugs, hideSlugs, notes: "Managed via admin API." };
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(data, null, 2));
  res.json({ success: true, overrides: data });
});

// POST /api/admin/reload — hot-reload schemes JSON without restart
app.post("/api/admin/reload", (req, res) => {
  loadSchemes();
  invalidateSchemeCache();  // flush RAG recommendation engine cache
  broadcast({ type: "reload", message: "Schemes data reloaded.", count: SCHEMES_ENHANCED.length });
  res.json({ success: true, count: SCHEMES_ENHANCED.length });
});

// ---------------------------------------------------------------------------
// ── Health ──────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

app.get("/api/health", async (req, res) => {
  let nlpStatus = "unknown";
  try {
    const r = await axios.get(`${PYTHON_NLP_URL}/health`, { timeout: 2000 });
    nlpStatus = r.data.status === "ok" ? "ok" : "degraded";
  } catch (_) { nlpStatus = "unreachable"; }

  res.json({
    status:          "ok",
    port:            PORT,
    schemesLoaded:   SCHEMES_ENHANCED.length,
    nlpService:      nlpStatus,
    nlpUrl:          PYTHON_NLP_URL,
    translationCache: translateCache.size,
    uptime:          process.uptime()
  });
});

// ---------------------------------------------------------------------------
// ── Scheduled Jobs ──────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

// Every 30 minutes: rotating scheme tips via real notification service
const SCHEME_TIPS = [
  { title: "PM-KISAN Scheme",           message: "💡 Eligible farmers receive Rs 6,000/year directly to their bank account. Check if you qualify!", schemeName: "PM-KISAN" },
  { title: "Ayushman Bharat – PMJAY",   message: "🏥 Free health cover up to Rs 5 lakh/year for BPL families at empanelled hospitals.", schemeName: "Ayushman Bharat" },
  { title: "National Scholarship Portal",message: "🎓 50+ scholarships for SC/ST/OBC/Minority students. Apply before deadlines!", schemeName: "National Scholarship Portal" },
  { title: "PM Mudra Yojana",           message: "💼 Collateral-free business loans up to Rs 10 lakh for small entrepreneurs.", schemeName: "PM Mudra Yojana" },
  { title: "PM Awas Yojana",            message: "🏠 Housing assistance for EWS/LIG/BPL families in rural and urban areas.", schemeName: "PM Awas Yojana" },
  { title: "Sukanya Samriddhi Yojana",  message: "👩 8.2% interest rate for girl child savings — one of the highest guaranteed returns in India.", schemeName: "Sukanya Samriddhi Yojana" },
  { title: "Check Your Eligibility",    message: "⚡ Find all schemes you qualify for in under 2 minutes using the Eligibility Assessment tool!", schemeName: null },
];
let tipIndex = 0;
cron.schedule("*/30 * * * *", () => {
  const tip = SCHEME_TIPS[tipIndex % SCHEME_TIPS.length];
  tipIndex++;
  notifService.createNotification({
    type:       tip.schemeName ? notifService.TYPES.NEW_SCHEME : notifService.TYPES.SCHEME_UPDATED,
    title:      tip.title,
    message:    tip.message,
    schemeName: tip.schemeName,
    priority:   "low",
  });
});

// Daily at 9 AM: good morning summary
cron.schedule("0 9 * * *", () => {
  const total = SCHEMES_ENHANCED.length || SCHEMES_SIMPLE.length;
  notifService.createNotification({
    type:     notifService.TYPES.SCHEME_UPDATED,
    title:    "Daily Schemes Update",
    message:  `🌅 Good morning! ${total} government schemes are available today. Use the Eligibility Checker to find yours.`,
    priority: "medium",
  });
});

// ---------------------------------------------------------------------------
// ── Start ───────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  GovMatch AI — Express Server`);
  console.log(`  Port : ${PORT}`);
  console.log(`  NLP  : ${PYTHON_NLP_URL}`);
  console.log(`  LLM  : ${OPENROUTER_KEY ? "OpenRouter configured" : "No key — fallback mode"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Fire a welcome notification 2 seconds after boot
  // (delayed so WS server is fully ready before any client connects)
  setTimeout(() => {
    const total = SCHEMES_ENHANCED.length || SCHEMES_SIMPLE.length;
    notifService.createNotification({
      type:     notifService.TYPES.NEW_SCHEME,
      title:    "GovMatch AI is Live!",
      message:  `✅ ${total} government schemes loaded. Search, check eligibility, or ask the AI assistant to get started.`,
      priority: "high",
    });
  }, 2000);
});

module.exports = { app, server };
