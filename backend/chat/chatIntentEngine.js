/**
 * GovMatch AI — Chat Intent Engine v2
 * Full 17-intent classifier with:
 *  - Mixed-language (Hinglish / Kanglish / Tanglish / Tenglish) normalization
 *  - Prioritised multi-signal matching (each intent scored separately)
 *  - Follow-up & context-reference detection
 *  - Conversation-state awareness (what was last discussed)
 *
 * Backward-compatible: exports same { classifyIntent, buildSearchQuery }
 * ADDITIVE: does not touch any other file.
 */

"use strict";

// ── Mixed-language normalization ─────────────────────────────────────────────
// Transliterates common Indic-English mixed tokens to their English equivalents
// so downstream regex patterns can match them.
const TRANSLITERATION_MAP = [
  // Kannada-English (Kanglish)
  [/\byavudu\b/gi,       "what"],
  [/\behange\b/gi,       "how"],
  [/\byaaru\b/gi,        "who"],
  [/\beshtu\b/gi,        "how much"],
  [/\bge\b/gi,           "for"],
  [/\bmattu\b/gi,        "and"],
  [/\bide\b/gi,          "is"],
  [/\benu\b/gi,          "what"],
  [/\billva\b/gi,        "not"],
  [/\bhaege\b/gi,        "how"],
  // Hindi-English (Hinglish)
  [/\bke liye\b/gi,      "for"],
  [/\bkya\b/gi,          "what"],
  [/\bkaise\b/gi,        "how"],
  [/\bkitna\b/gi,        "how much"],
  [/\bkaun\b/gi,         "who"],
  [/\bkab\b/gi,          "when"],
  [/\bkahan\b/gi,        "where"],
  [/\bkoi\b/gi,          "any"],
  [/\bmujhe\b/gi,        "me"],
  [/\bhain\b/gi,         "is"],
  [/\bhai\b/gi,          "is"],
  [/\bnahi\b/gi,         "not"],
  [/\bnahin\b/gi,        "not"],
  [/\bchahiye\b/gi,      "need"],
  [/\bkarna\b/gi,        "do"],
  [/\bkaro\b/gi,         "do"],
  [/\bmilega\b/gi,       "will get"],
  [/\bpathal\b/gi,       "eligibility"],
  // Tamil-English (Tanglish)
  [/\benna\b/gi,         "what"],
  [/\bepadi\b/gi,        "how"],
  [/\byaar\b/gi,         "who"],
  [/\bevvalavu\b/gi,     "how much"],
  [/\bpannalam\b/gi,     "can do"],
  [/\bpannum\b/gi,       "can do"],
  [/\billai\b/gi,        "not"],
  [/\bvendum\b/gi,       "need"],
  [/\bthevai\b/gi,       "need"],
  // Telugu-English (Tenglish)
  [/\bemi\b/gi,          "what"],
  [/\benni\b/gi,         "how many"],
  [/\bekkada\b/gi,       "where"],
  [/\bevaru\b/gi,        "who"],
  [/\bcheyalama\b/gi,    "can do"],
  [/\bcheyali\b/gi,      "should do"],
  [/\bkavali\b/gi,       "need"],
  [/\bledu\b/gi,         "not"],
  // Marathi-English
  [/\bkashi\b/gi,        "how"],
  [/\bkonti\b/gi,        "which"],
  [/\bkay\b/gi,          "what"],
  [/\bkiti\b/gi,         "how much"],
  [/\bkon\b/gi,          "who"],
];

function normalizeMessage(text) {
  let normalized = (text || "").trim();
  for (const [pattern, replacement] of TRANSLITERATION_MAP) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

// ── Intent definitions (17 intents) ─────────────────────────────────────────
// Each intent has:
//   - score weights: each matched pattern adds to score
//   - minScore: minimum score to claim this intent
// Highest-scoring intent wins (not first-match).

const INTENTS = [
  // ── Conversational ───────────────────────────────────────────────────────
  {
    intent: "greeting",
    patterns: [
      { rx: /^(hi|hello|hey|namaste|namaskar|helo|hii|vanakkam|sat sri akal|jai hind|good\s*(morning|evening|afternoon|day))\b/i, score: 10 },
      { rx: /^(howdy|what'?s up|sup|greetings)\b/i, score: 8 },
    ],
    minScore: 8,
  },
  {
    intent: "thanks",
    patterns: [
      { rx: /\b(thank|thanks|thank you|thankyou|dhanyavad|shukriya|nandri|dhanyavaadagalu|kripaya)\b/i, score: 10 },
      { rx: /\b(appreciated|helpful|great help|wonderful|amazing)\b/i, score: 6 },
    ],
    minScore: 6,
  },
  {
    intent: "goodbye",
    patterns: [
      { rx: /\b(bye|goodbye|see you|later|exit|quit|alvida|poitu varen|vellutene|chal raha)\b/i, score: 10 },
      { rx: /\b(that'?s all|nothing else|done|finished|ok thanks bye)\b/i, score: 7 },
    ],
    minScore: 7,
  },
  {
    intent: "what_can_you_do",
    patterns: [
      { rx: /\b(what can you (do|help|tell)|what do you (do|know)|how can you help|what (are|is) your (feature|capabilit|function)|help me|can you help)\b/i, score: 10 },
      { rx: /\b(what (are|is) (this|govmatch|chatbot)|tell me about yourself|who are you|what is govmatch)\b/i, score: 8 },
    ],
    minScore: 8,
  },
  {
    intent: "clarify_explain",
    patterns: [
      { rx: /\b(explain|simplify|simple|easy|again|repeat|didn.?t understand|not clear|confused|elaborate|in simple|layman)\b/i, score: 9 },
      { rx: /\b(what does .+ mean|meaning of|define|what is meant)\b/i, score: 8 },
      { rx: /\b(tell me again|once more|rephrase|say again)\b/i, score: 9 },
      { rx: /\b(i (did(n.?t| not)|don.?t) (understand|get it|follow)|not understood|please explain)\b/i, score: 10 },
      { rx: /\b(can you (explain|simplify|rephrase|repeat|say that again))\b/i, score: 10 },
    ],
    minScore: 8,
  },
  {
    intent: "language_change",
    patterns: [
      { rx: /\b(switch to|change (language|lang)|speak in|reply in|answer in|use hindi|use kannada|use tamil|use telugu|in (hindi|kannada|tamil|telugu|english|marathi))\b/i, score: 10 },
      { rx: /\b(hindi mein|kannada alli|tamil la|telugu lo|english lo)\b/i, score: 10 },
    ],
    minScore: 10,
  },
  // ── Follow-up & context ───────────────────────────────────────────────────
  {
    intent: "followup_which_one",
    patterns: [
      { rx: /\b(first one|second one|third one|1st|2nd|3rd|that one|this one|the (first|second|third|last) scheme)\b/i, score: 10 },
      { rx: /\b(previous(ly)?|earlier|before|the one you (mentioned|said|told))\b/i, score: 8 },
    ],
    minScore: 8,
  },
  {
    intent: "followup_compare",
    patterns: [
      { rx: /\b(which (is|one is) (better|best)|compare|vs|versus|difference between|better than|preferred)\b/i, score: 10 },
      { rx: /\b(which (should|would) (i|one)|best option|most suitable)\b/i, score: 8 },
    ],
    minScore: 8,
  },
  // ── Scheme intelligence ───────────────────────────────────────────────────
  {
    intent: "scheme_search",
    patterns: [
      { rx: /\b(show|find|list|give|tell|what) ?(me )?(all |available )?(scheme|yojana|subsidy|grant|benefit|programme|plan|welfare|policy|initiative)\b/i, score: 10 },
      { rx: /\b(scheme|yojana|subsidy|grant|welfare|programme)\b/i, score: 5 },
      { rx: /\b(available|applicable|suitable) ?(for|scheme)/i, score: 6 },
      { rx: /\b(government (help|support|aid|assistance|benefit))\b/i, score: 7 },
      // "schemes for farmers / students / women / senior citizens"
      { rx: /\bschemes?\s+for\s+\w+/i, score: 9 },
      // "show / find / get me schemes"
      { rx: /\b(show|get|give|find)\s+(me\s+)?schemes?\b/i, score: 9 },
    ],
    minScore: 5,
  },
  {
    intent: "eligibility_check",
    patterns: [
      { rx: /\b(am i|can i|will i|do i|could i) (eligible|qualify|get|apply|use|avail)\b/i, score: 12 },
      { rx: /\b(eligible|qualify|qualification|eligib|who can|requirement|criteria|condition|criterion)\b/i, score: 8 },
      { rx: /\b(do i (meet|fulfil|satisfy)|i (qualify|meet)|am i qualified)\b/i, score: 10 },
      { rx: /\b(can i get (this|the|a)|am i qualified|do i qualify)\b/i, score: 10 },
      { rx: /\bpaat(r|rata)\b/gi, score: 8 },  // Kannada/Hindi "patra" = eligible
      // After normalization: "for eligibility what" → catches mixed-lang eligibility queries
      { rx: /\bfor\b.{0,20}\beligib/i, score: 9 },
    ],
    minScore: 8,
  },
  {
    intent: "documents_required",
    patterns: [
      { rx: /\b(document|papers?|certificate|proof|id|identity|aadhaar|aadhar|pan card|passport|income proof)\b/i, score: 9 },
      { rx: /\b(what do i need|what (are|is) (needed|required)|need to (submit|bring|provide|attach))\b/i, score: 7 },
      { rx: /\b(documents? (required|needed|to (submit|bring|upload)))\b/i, score: 12 },
      // Natural phrasing: "What documents do I need?" + mixed-lang "documents ... need"
      { rx: /\bwhat\b.{0,20}\bdocument\b/i, score: 12 },
      { rx: /\bdocuments?\b.{0,20}\bneed\b/i, score: 15 },
      { rx: /\bneed\b.{0,20}\bdocuments?\b/i, score: 12 },
    ],
    minScore: 7,
  },
  {
    intent: "application_process",
    patterns: [
      { rx: /\b(how (do|can|to)|steps? (to|for)|procedure|process|apply|application)\b/i, score: 8 },
      { rx: /\b(how to (apply|register|submit|fill|enroll)|apply online|apply offline|portal)\b/i, score: 12 },
      { rx: /\b(where (do|can) i (apply|register)|application process)\b/i, score: 10 },
      { rx: /\b(step.?by.?step|fill (the|a) form|submit application)\b/i, score: 10 },
      // "How do I apply?" — natural phrasing
      { rx: /\bhow\b.{0,15}\b(apply|register|enroll|submit)\b/i, score: 12 },
    ],
    minScore: 8,
  },
  {
    intent: "benefit_inquiry",
    patterns: [
      { rx: /\b(benefit|how much|amount|money|rupee|rs\.|₹|get from|receive|payment|financial|assist|support|give)\b/i, score: 8 },
      { rx: /\b(what (do|will|can) i get|what('?s| is) (the benefit|offered)|what (money|amount))\b/i, score: 10 },
      { rx: /\b(how much (money|benefit|amount)|payment amount|disburs)\b/i, score: 10 },
      // "What are the benefits?" — natural phrasing including "the benefits"
      { rx: /\bwhat\b.{0,30}\bbenefit/i, score: 10 },
      { rx: /\bbenefits?\b/i, score: 8 },
    ],
    minScore: 8,
  },
  {
    intent: "scheme_details",
    patterns: [
      { rx: /\b(tell me about|information (on|about)|details? (of|about|on)|what is|describe|overview|explain) .{3,}\b/i, score: 9 },
      { rx: /\b(what is (pm.?kisan|pmfby|pmay|mudra|ayushman|nrega|sukanya|beti bachao))\b/i, score: 12 },
      { rx: /\b(about (the|this|that) scheme|scheme details|more (about|on|info))\b/i, score: 9 },
    ],
    minScore: 9,
  },
  {
    intent: "personalized_recommendation",
    patterns: [
      { rx: /\b(for (me|my|myself|a? ?farmer|a? ?student|a? ?woman|a? ?widow|a? ?disabled|a? ?senior)|recommend|suggest|suitable|best (scheme|for))\b/i, score: 9 },
      { rx: /\b(what (can|should) i apply|what (scheme|benefit) am i|my (profile|details)|based on my)\b/i, score: 10 },
      { rx: /\b(i am a? ?(farmer|student|entrepreneur|worker|homemaker|widow|disabled|senior))\b/i, score: 9 },
    ],
    minScore: 9,
  },
  {
    intent: "status_inquiry",
    patterns: [
      { rx: /\b(status|track|check|application status|payment status|when (will|do)|pending|approved|rejected)\b/i, score: 9 },
      { rx: /\b(how (long|many days)|waiting|already applied|submitted|update)\b/i, score: 7 },
    ],
    minScore: 7,
  },
  {
    intent: "general_query",
    patterns: [
      { rx: /.+/, score: 1 },  // catches everything with minimum score
    ],
    minScore: 1,
  },
];

// ── Domain keyword extractor ─────────────────────────────────────────────────
const DOMAIN_KEYWORDS = {
  agriculture:  /\b(farm|farmer|kisan|crop|agriculture|land|rural|irrigation|seed|fertilizer|solar pump|kisaan)\b/i,
  education:    /\b(student|scholarship|education|school|college|study|tuition|degree|university|vidyarthi)\b/i,
  health:       /\b(health|medical|hospital|insurance|ayushman|disability|divyangjan|medicine|bima)\b/i,
  business:     /\b(business|startup|mudra|entrepreneur|loan|msme|enterprise|shop|trade|vyapar)\b/i,
  employment:   /\b(job|employment|skill|training|apprentice|work|labour|labor|nrega|rozgar)\b/i,
  women:        /\b(woman|women|girl|female|widow|mother|self.help|shg|beti|mahila)\b/i,
  housing:      /\b(house|housing|pm awas|shelter|flat|home|pmay|makan|awas)\b/i,
  social:       /\b(pension|old age|senior|bpl|below poverty|ration|food|sc|st|obc|minority|vridha)\b/i,
};

/**
 * Classify message intent using multi-signal scoring.
 * @param {string} message  raw user message
 * @returns {{ intent: string, domains: string[], confidence: number, normalized: string }}
 */
function classifyIntent(message) {
  const normalized = normalizeMessage(message || "");

  // Score every intent
  const scores = INTENTS.map(intentDef => {
    let total = 0;
    for (const { rx, score } of intentDef.patterns) {
      if (rx.test(normalized)) total += score;
    }
    return { intent: intentDef.intent, score: total, minScore: intentDef.minScore };
  });

  // Filter by minScore threshold, then pick highest scorer
  const eligible = scores.filter(s => s.score >= s.minScore);
  eligible.sort((a, b) => b.score - a.score);

  const best = eligible[0] || { intent: "general_query", score: 1 };

  // Extract domain signals from normalized text
  const domains = [];
  for (const [domain, pattern] of Object.entries(DOMAIN_KEYWORDS)) {
    if (pattern.test(normalized)) domains.push(domain);
  }

  const confidence = best.score >= 10 ? 0.95
    : best.score >= 7  ? 0.80
    : best.score >= 5  ? 0.65
    : 0.40;

  return { intent: best.intent, domains, confidence, normalized };
}

/**
 * Build an optimized NLP search query from the raw message + intent context.
 * @param {string} message
 * @param {{ intent: string, domains: string[], normalized: string }} intentResult
 * @param {object} profile  citizen profile
 * @returns {string}
 */
function buildSearchQuery(message, intentResult, profile = {}) {
  // Use normalized text as the base (mixed-language already resolved)
  const parts = [intentResult.normalized || message.trim()];

  // Inject profile context to narrow semantic search
  if (profile.occupation) parts.push(profile.occupation);
  if (profile.state && profile.state !== "Central") parts.push(profile.state);
  if (profile.caste && profile.caste !== "general") parts.push(profile.caste);
  if (profile.gender === "female") parts.push("women");

  // De-duplicate and join
  return [...new Set(parts.filter(Boolean))].join(" ");
}

module.exports = { classifyIntent, buildSearchQuery, normalizeMessage };
