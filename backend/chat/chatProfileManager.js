/**
 * GovMatch AI — Chat Profile Manager
 * Automatically scans user messages for demographic signals and returns
 * an `extractedProfile` payload that the frontend can use to auto-fill
 * the citizen's eligibility profile.
 *
 * Designed to be non-destructive: only fields with confident matches are
 * returned; partial or ambiguous signals are ignored.
 */

"use strict";

// ── State name → canonical mapping ──────────────────────────────────────────
const STATE_MAP = {
  "andhra pradesh":   "Andhra Pradesh",
  "ap":               "Andhra Pradesh",
  "arunachal":        "Arunachal Pradesh",
  "assam":            "Assam",
  "bihar":            "Bihar",
  "chhattisgarh":     "Chhattisgarh",
  "delhi":            "Delhi",
  "goa":              "Goa",
  "gujarat":          "Gujarat",
  "haryana":          "Haryana",
  "himachal":         "Himachal Pradesh",
  "hp":               "Himachal Pradesh",
  "jharkhand":        "Jharkhand",
  "karnataka":        "Karnataka",
  "kerala":           "Kerala",
  "madhya pradesh":   "Madhya Pradesh",
  "mp":               "Madhya Pradesh",
  "maharashtra":      "Maharashtra",
  "manipur":          "Manipur",
  "meghalaya":        "Meghalaya",
  "mizoram":          "Mizoram",
  "nagaland":         "Nagaland",
  "odisha":           "Odisha",
  "punjab":           "Punjab",
  "rajasthan":        "Rajasthan",
  "sikkim":           "Sikkim",
  "tamil nadu":       "Tamil Nadu",
  "tn":               "Tamil Nadu",
  "telangana":        "Telangana",
  "tripura":          "Tripura",
  "uttar pradesh":    "Uttar Pradesh",
  "up":               "Uttar Pradesh",
  "uttarakhand":      "Uttarakhand",
  "west bengal":      "West Bengal",
  "wb":               "West Bengal",
  "jammu":            "Jammu & Kashmir",
  "j&k":              "Jammu & Kashmir",
  "ladakh":           "Ladakh",
};

// ── Canonical occupation values ───────────────────────────────────────────────
const OCCUPATION_MAP = {
  "farmer":          "Farmer",
  "kisan":           "Farmer",
  "agriculture":     "Farmer",
  "student":         "Student",
  "entrepreneur":    "Entrepreneur",
  "business":        "Entrepreneur",
  "self.employed":   "Self-Employed",
  "self employed":   "Self-Employed",
  "salaried":        "Salaried Employee",
  "employed":        "Salaried Employee",
  "daily wage":      "Daily Wage Worker",
  "labourer":        "Daily Wage Worker",
  "laborer":         "Daily Wage Worker",
  "worker":          "Daily Wage Worker",
  "unemployed":      "Unemployed",
  "homemaker":       "Homemaker",
  "housewife":       "Homemaker",
  "retired":         "Retired",
  "teacher":         "Salaried Employee",
  "doctor":          "Salaried Employee",
  "engineer":        "Salaried Employee",
};

// ── Extraction rules ─────────────────────────────────────────────────────────
const RULES = [
  // Age — "I am 28", "28 years old", "aged 28", "age 28"
  {
    key: "age",
    rx: /\b(?:i(?:'m| am)|aged?|age)\s+(\d{1,3})(?:\s*(?:year|yr|years|yrs))?/i,
    parse: (m) => {
      const v = parseInt(m[1], 10);
      return (v >= 1 && v <= 110) ? v : null;
    },
  },
  // Also plain "28 year old"
  {
    key: "age",
    rx: /\b(\d{1,3})\s*[-\s]?(?:year|yr)s?[- ]?old\b/i,
    parse: (m) => {
      const v = parseInt(m[1], 10);
      return (v >= 1 && v <= 110) ? v : null;
    },
  },
  // Gender
  {
    key: "gender",
    rx: /\b(?:i(?:'m| am)\s+a?\s*)?(male|female|woman|man|girl|boy|transgender)\b/i,
    parse: (m) => {
      const raw = m[1].toLowerCase();
      return { male: "male", man: "male", boy: "male", female: "female", woman: "female", girl: "female", transgender: "transgender" }[raw] || null;
    },
  },
  // State — "from Karnataka", "in Tamil Nadu", "living in UP"
  {
    key: "state",
    rx: /\b(?:from|in|at|living in|based in|resident of|residing in)\s+([a-z\s&]+?)(?=\s*[.,;!?]|\s+and|\s+with|\s+who|$)/i,
    parse: (m) => {
      const raw = m[1].trim().toLowerCase().replace(/\s+/g, " ");
      // Try full match first, then prefix
      if (STATE_MAP[raw]) return STATE_MAP[raw];
      for (const [k, v] of Object.entries(STATE_MAP)) {
        if (raw.startsWith(k) || raw.includes(k)) return v;
      }
      return null;
    },
  },
  // Occupation
  {
    key: "occupation",
    rx: /\b(?:i(?:'m| am)\s+a?\s*)?(farmer|kisan|student|entrepreneur|salaried|employed|unemployed|daily wage|labourer|laborer|worker|homemaker|housewife|retired|teacher|doctor|engineer|self[- ]employed|business(?:man|woman|person)?)\b/i,
    parse: (m) => {
      const raw = m[1].toLowerCase().replace(/-/g, " ");
      for (const [k, v] of Object.entries(OCCUPATION_MAP)) {
        if (raw.includes(k)) return v;
      }
      return null;
    },
  },
  // Caste
  {
    key: "caste",
    rx: /\b(general|obc|sc|st|scheduled caste|scheduled tribe|other backward|minority|ews|economically weaker)\b/i,
    parse: (m) => {
      const raw = m[1].toLowerCase();
      if (raw.includes("scheduled caste")) return "sc";
      if (raw.includes("scheduled tribe"))  return "st";
      if (raw.includes("other backward"))   return "obc";
      if (raw.includes("economically weaker")) return "ews";
      return ["sc","st","obc","general","minority","ews"].includes(raw) ? raw : null;
    },
  },
  // Income
  {
    key: "annualIncome",
    rx: /(?:annual|yearly|per year|family)?\s*income\s+(?:is|of|around|about)?\s*(?:rs\.?\s*)?(\d[\d,]*)\s*(?:lakh|lac|thousand|k)?/i,
    parse: (m) => {
      const numStr = m[1].replace(/,/g, "");
      let val = parseInt(numStr, 10);
      const suffix = (m[0] || "").toLowerCase();
      if (suffix.includes("lakh") || suffix.includes("lac")) val *= 100000;
      else if (suffix.includes("thousand") || suffix.includes("k"))   val *= 1000;
      return (val > 0 && val < 50000000) ? val : null;
    },
  },
  // BPL
  {
    key: "bplCard",
    rx: /\bbpl\b|below poverty line/i,
    parse: () => true,
  },
  // Disability
  {
    key: "disability",
    rx: /\b(disabled|disability|divyang|divyangjan|specially abled|physically challenged|handicapped)\b/i,
    parse: () => true,
  },
  // Widow / single mother
  {
    key: "isWidow",
    rx: /\b(widow|widowed|single mother|single mom)\b/i,
    parse: () => true,
  },
  // Student
  {
    key: "isStudent",
    rx: /\b(?:i am a |i'm a |currently (?:a |an ))?student\b/i,
    parse: () => true,
  },
];

/**
 * Scan a message for demographic signals.
 * Returns only fields with confident non-null extractions.
 *
 * @param {string} message
 * @returns {object}  partial profile object (only extracted keys)
 */
function extractProfileSignals(message) {
  const text = (message || "").trim();
  const extracted = {};
  const seen = new Set(); // avoid duplicate key overwrites from multiple rules

  for (const rule of RULES) {
    if (seen.has(rule.key)) continue;
    const match = text.match(rule.rx);
    if (!match) continue;
    const value = rule.parse(match);
    if (value !== null && value !== undefined) {
      extracted[rule.key] = value;
      seen.add(rule.key);
    }
  }

  return extracted;
}

/**
 * Merge extracted signals into an existing profile (non-destructive).
 * Existing values are NOT overwritten unless the new value is more specific.
 *
 * @param {object} existing  current profile
 * @param {object} signals   newly extracted signals
 * @returns {object}         merged profile
 */
function mergeProfile(existing, signals) {
  return { ...existing, ...signals };
}

/**
 * Build a human-readable summary of what was detected, for the
 * "Update Profile" action chip displayed in the chat.
 *
 * @param {object} signals
 * @returns {string|null}
 */
function buildDetectionSummary(signals) {
  if (!signals || !Object.keys(signals).length) return null;

  const parts = [];
  if (signals.age)        parts.push(`${signals.age} years old`);
  if (signals.gender)     parts.push(signals.gender);
  if (signals.occupation) parts.push(signals.occupation.toLowerCase());
  if (signals.state)      parts.push(`from ${signals.state}`);
  if (signals.caste && signals.caste !== "general") parts.push(signals.caste.toUpperCase());
  if (signals.bplCard)    parts.push("BPL card holder");
  if (signals.disability) parts.push("person with disability");
  if (signals.isWidow)    parts.push("widow / single mother");
  if (signals.isStudent)  parts.push("student");

  return parts.length ? parts.join(", ") : null;
}

module.exports = { extractProfileSignals, mergeProfile, buildDetectionSummary };
