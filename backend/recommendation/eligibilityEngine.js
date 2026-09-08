/**
 * GovMatch AI — Eligibility Engine
 * Hard demographic checks: returns { passed, score, reasons, missing }
 */

const CENTRAL_KEYWORDS = ["central", ""];

// Extract numeric bounds from eligibility text
function extractAgeBounds(text = "") {
  const t = text.toLowerCase();
  let minAge = 0, maxAge = 120;

  // patterns: "18-60", "above 18", "below 60", "minimum 18", "upto 45"
  const rangeMatch = t.match(/(\d+)\s*[-–to]+\s*(\d+)\s*years?/);
  if (rangeMatch) {
    minAge = parseInt(rangeMatch[1]);
    maxAge = parseInt(rangeMatch[2]);
  } else {
    const minMatch = t.match(/(?:above|minimum|min|at least|more than)\s*(\d+)/);
    if (minMatch) minAge = parseInt(minMatch[1]);
    const maxMatch = t.match(/(?:below|maximum|max|up\s*to|upto|under)\s*(\d+)/);
    if (maxMatch) maxAge = parseInt(maxMatch[1]);
  }
  return { minAge, maxAge };
}

// Extract income ceiling from eligibility text (annual, in INR)
function extractIncomeCeiling(text = "") {
  const t = text.toLowerCase();
  // "income below rs 3 lakh", "annual income up to 1.5 lakh"
  const match = t.match(/(?:income|earning)[^₹rs\d]*(?:rs\.?|₹)?\s*([\d.]+)\s*(lakh|crore|thousand)?/i);
  if (!match) return Infinity;
  let val = parseFloat(match[1]);
  const unit = (match[2] || "").toLowerCase();
  if (unit === "lakh")   val *= 100000;
  if (unit === "crore")  val *= 10000000;
  if (unit === "thousand") val *= 1000;
  return val;
}

// Normalise state names for comparison
function normState(s = "") { return s.trim().toLowerCase(); }

/**
 * Check a single scheme against a user profile.
 *
 * profile: {
 *   state, gender, age, annualIncome, caste, occupation
 * }
 * scheme fields used: state, level, gender_constraint, eligibility, category
 */
function checkEligibility(scheme, profile) {
  const reasons  = [];   // why it passed each check
  const missing  = [];   // optional info that could raise score
  let   passed   = true;
  let   score    = 0;    // 0–1 continuous match score
  let   checks   = 0;

  // ── 1. State Match ──────────────────────────────────────────────────────
  const schemeLvl   = (scheme.level  || "").toLowerCase();
  const schemeState = normState(scheme.state || "");
  const userState   = normState(profile.state || "");

  checks++;
  if (schemeLvl === "central" || schemeState === "central") {
    score += 1;
    reasons.push("Central scheme — available across India");
  } else if (userState && schemeState === userState) {
    score += 1;
    reasons.push(`Matches your ${profile.state} state residence`);
  } else if (userState && schemeState !== userState) {
    passed = false;
    missing.push(`Scheme is for ${scheme.state} residents only`);
  } else {
    score += 0.5; // state unknown
    missing.push("Confirm your state to verify eligibility");
  }

  // ── 2. Gender Check ─────────────────────────────────────────────────────
  const gc         = (scheme.gender_constraint || "any").toLowerCase();
  const userGender = (profile.gender || "").toLowerCase();

  checks++;
  if (gc === "any") {
    score += 1;
    reasons.push("Open to all genders");
  } else if (gc === "female_only") {
    if (userGender === "female") {
      score += 1;
      reasons.push("Matches female gender requirement");
    } else if (userGender === "male") {
      passed = false;
      missing.push("This scheme is exclusively for female applicants");
    } else {
      score += 0.5;
      missing.push("Scheme is for females — confirm your gender");
    }
  }

  // ── 3. Age Bounds ────────────────────────────────────────────────────────
  const eligText       = scheme.eligibility || "";
  const { minAge, maxAge } = extractAgeBounds(eligText);
  const userAge        = parseInt(profile.age) || 0;

  checks++;
  if (!userAge) {
    score += 0.7;
    missing.push("Provide your age to verify age eligibility");
  } else if (userAge >= minAge && userAge <= maxAge) {
    score += 1;
    if (minAge > 0 || maxAge < 120)
      reasons.push(`Age ${userAge} within required range (${minAge}–${maxAge})`);
  } else {
    passed = false;
    missing.push(`Age requirement: ${minAge}–${maxAge} years (yours: ${userAge})`);
  }

  // ── 4. Income Ceiling ────────────────────────────────────────────────────
  const ceiling    = extractIncomeCeiling(eligText);
  const userIncome = parseFloat(profile.annualIncome) || 0;

  checks++;
  if (ceiling === Infinity) {
    score += 1;
    // no income cap mentioned
  } else if (!userIncome) {
    score += 0.7;
    missing.push(`Income ceiling: ₹${(ceiling / 100000).toFixed(1)} lakh — provide income to verify`);
  } else if (userIncome <= ceiling) {
    score += 1;
    reasons.push(`Annual income ₹${(userIncome / 100000).toFixed(1)}L within ceiling ₹${(ceiling / 100000).toFixed(1)}L`);
  } else {
    passed = false;
    missing.push(`Income exceeds ceiling of ₹${(ceiling / 100000).toFixed(1)} lakh`);
  }

  // ── 5. Caste / Category ──────────────────────────────────────────────────
  const userCaste  = (profile.caste || "general").toLowerCase();
  const eligLower  = eligText.toLowerCase();

  checks++;
  const casteMap = {
    sc: ["sc", "scheduled caste", "dalit"],
    st: ["st", "scheduled tribe", "tribal"],
    obc: ["obc", "other backward"],
    minority: ["minority", "muslim", "christian", "sikh"],
    general: []
  };

  const requiredCastes = Object.entries(casteMap)
    .filter(([, kws]) => kws.some(kw => eligLower.includes(kw)))
    .map(([key]) => key);

  if (requiredCastes.length === 0 || requiredCastes.includes(userCaste)) {
    score += 1;
    if (requiredCastes.length > 0)
      reasons.push(`Matches your ${userCaste.toUpperCase()} category`);
  } else if (requiredCastes.includes("sc") || requiredCastes.includes("st")) {
    // SC/ST preference — general can still apply at lower priority
    score += 0.4;
    missing.push(`Priority for ${requiredCastes.join("/").toUpperCase()} — general category may apply`);
  } else {
    score += 0.6;
  }

  // ── 6. Occupation Match ──────────────────────────────────────────────────
  const userOccupation = (profile.occupation || "").toLowerCase();
  const occupationMap = {
    farmer:       ["farmer", "kisan", "agriculture", "crop", "cultivat"],
    student:      ["student", "education", "scholarship", "school", "college"],
    entrepreneur: ["entrepreneur", "business", "startup", "msme", "enterprise", "vendor"],
    unemployed:   ["unemployed", "job", "employment", "livelihood", "skill"],
    "daily wage": ["labour", "worker", "daily wage", "migrant", "informal"]
  };

  checks++;
  const combinedText = `${eligLower} ${(scheme.brief_description || "").toLowerCase()}`;
  let occupationScore = 0.7; // neutral default (raised from 0.6 — most schemes open to all)
  let schemeTargetsSpecificOccupation = false;

  for (const [occ, kws] of Object.entries(occupationMap)) {
    if (kws.some(kw => combinedText.includes(kw))) {
      schemeTargetsSpecificOccupation = true;
      if (userOccupation.includes(occ) || kws.some(kw => userOccupation.includes(kw))) {
        occupationScore = 1;
        reasons.push(`Matches your ${profile.occupation} occupation`);
        break;
      } else if (userOccupation) {
        // Scheme targets a SPECIFIC occupation that user doesn't have.
        // Only penalise if the scheme's ENTIRE eligibility is occupation-gated.
        // Use 0.5 (not 0.3) — user might still benefit from this scheme.
        occupationScore = 0.5;
      }
    }
  }
  score += occupationScore;

  // ── 7. Disability / Special Status ──────────────────────────────────────
  const DISABILITY_KEYWORDS = ["divyang", "disability", "handicap", "differently abled", "pwd", "physically challenged"];
  const WIDOW_KEYWORDS      = ["widow", "vidhwa", "destitute woman"];
  const BPL_KEYWORDS        = ["bpl", "below poverty", "ration card", "antyodaya"];

  checks++;
  let specialScore = 0.8; // neutral — most schemes open to all

  if (DISABILITY_KEYWORDS.some(kw => eligLower.includes(kw))) {
    if (profile.disability) {
      specialScore = 1;
      reasons.push("Matches your disability / Divyangjan eligibility");
    } else {
      specialScore = 0.3; // scheme is specifically for disabled — lower priority for others
      missing.push("This scheme is specifically for persons with disabilities");
    }
  } else if (WIDOW_KEYWORDS.some(kw => eligLower.includes(kw))) {
    if (profile.isWidow) {
      specialScore = 1;
      reasons.push("Matches widow / destitute woman eligibility");
    } else {
      specialScore = 0.4;
      missing.push("This scheme is specifically for widows");
    }
  } else if (BPL_KEYWORDS.some(kw => eligLower.includes(kw))) {
    if (profile.bplCard) {
      specialScore = 1;
      reasons.push("Matches BPL / Antyodaya card holder eligibility");
    } else {
      specialScore = 0.5;
      missing.push("BPL card / Antyodaya card may be required");
    }
  } else {
    // No special restriction — if user HAS a disability/is widow, give a small boost
    if (profile.disability || profile.isWidow || profile.bplCard) specialScore = 0.9;
  }
  score += specialScore;

  const normalised = score / checks;
  return { passed, score: normalised, reasons, missing };
}

module.exports = { checkEligibility, extractAgeBounds, extractIncomeCeiling };
