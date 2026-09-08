/**
 * GovMatch AI — Recommendation Engine Unit Tests (v2)
 * Tests: eligibilityEngine, compatibilityEngine (adaptive weights, edu cross-match),
 *        explainabilityEngine (star ratings, reason codes), chatRecommendationEngine,
 *        profileCompletenessEngine
 */

"use strict";

const {
  checkEligibility,
  extractAgeBounds,
  extractIncomeCeiling,
} = require("../recommendation/eligibilityEngine");

const {
  computeCompatibility,
  detectSchemeDomain,
  educationCompatibilityScore,
  getCategoryThreshold,
} = require("../recommendation/compatibilityEngine");

const {
  buildExplanation,
  buildStarRating,
  buildReasonCodes,
} = require("../recommendation/explainabilityEngine");

const {
  buildGroundTruthBlock,
  toFrontendSchemes,
} = require("../chat/chatRecommendationEngine");

const {
  computeProfileCompleteness,
  buildProfileQuery,
  generateAuditId,
} = require("../recommendation/profileCompletenessEngine");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeScheme(overrides = {}) {
  return {
    slug:              "test-scheme",
    name:              "Test Scheme",
    category:          "Agriculture",
    level:             "Central",
    state:             "Central",
    ministry:          "Ministry of Agriculture",
    brief_description: "Support for farmers",
    benefits:          "₹6000 per year",
    eligibility:       "All Indian farmers above 18 years",
    application_url:   "https://pmkisan.gov.in",
    gender_constraint: "any",
    ...overrides,
  };
}

function makeProfile(overrides = {}) {
  return {
    state:        "Karnataka",
    gender:       "male",
    age:          30,
    annualIncome: 100000,
    caste:        "general",
    occupation:   "farmer",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractAgeBounds
// ─────────────────────────────────────────────────────────────────────────────

describe("extractAgeBounds", () => {
  test("parses range pattern '18-60 years'", () => {
    const { minAge, maxAge } = extractAgeBounds("Applicant must be 18-60 years");
    expect(minAge).toBe(18);
    expect(maxAge).toBe(60);
  });

  test("parses 'above 18' lower bound", () => {
    const { minAge, maxAge } = extractAgeBounds("Must be above 18 years");
    expect(minAge).toBe(18);
    expect(maxAge).toBe(120);
  });

  test("parses 'below 45' upper bound", () => {
    const { minAge, maxAge } = extractAgeBounds("Applicant must be below 45 years");
    expect(minAge).toBe(0);
    expect(maxAge).toBe(45);
  });

  test("returns defaults when no age text", () => {
    const { minAge, maxAge } = extractAgeBounds("No age condition mentioned");
    expect(minAge).toBe(0);
    expect(maxAge).toBe(120);
  });

  test("parses 'minimum 21'", () => {
    const { minAge } = extractAgeBounds("Minimum 21 years of age required");
    expect(minAge).toBe(21);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractIncomeCeiling
// ─────────────────────────────────────────────────────────────────────────────

describe("extractIncomeCeiling", () => {
  test("parses 'income below rs 3 lakh'", () => {
    const ceiling = extractIncomeCeiling("Family income below Rs 3 lakh per annum");
    expect(ceiling).toBe(300000);
  });

  test("parses '1.5 lakh' ceiling", () => {
    const ceiling = extractIncomeCeiling("Annual income up to 1.5 lakh");
    expect(ceiling).toBe(150000);
  });

  test("returns Infinity when no income text", () => {
    const ceiling = extractIncomeCeiling("Open to all eligible citizens");
    expect(ceiling).toBe(Infinity);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkEligibility — state checks
// ─────────────────────────────────────────────────────────────────────────────

describe("checkEligibility — state", () => {
  test("central scheme passes regardless of user state", () => {
    const scheme  = makeScheme({ level: "Central", state: "Central" });
    const profile = makeProfile({ state: "Tamil Nadu" });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(true);
    expect(result.reasons.some(r => r.includes("Central"))).toBe(true);
  });

  test("state scheme fails for mismatching user state", () => {
    const scheme  = makeScheme({ level: "State", state: "Maharashtra" });
    const profile = makeProfile({ state: "Karnataka" });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(false);
  });

  test("state scheme passes for matching user state", () => {
    const scheme  = makeScheme({ level: "State", state: "Karnataka" });
    const profile = makeProfile({ state: "Karnataka" });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(true);
    expect(result.reasons.some(r => r.includes("Karnataka"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkEligibility — gender
// ─────────────────────────────────────────────────────────────────────────────

describe("checkEligibility — gender", () => {
  test("female_only scheme fails for male profile", () => {
    const scheme  = makeScheme({ gender_constraint: "female_only" });
    const profile = makeProfile({ gender: "male" });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(false);
  });

  test("female_only scheme passes for female profile", () => {
    const scheme  = makeScheme({ gender_constraint: "female_only" });
    const profile = makeProfile({ gender: "female" });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(true);
  });

  test("any gender scheme passes for any profile", () => {
    const scheme  = makeScheme({ gender_constraint: "any" });
    const profile = makeProfile({ gender: "male" });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkEligibility — age
// ─────────────────────────────────────────────────────────────────────────────

describe("checkEligibility — age", () => {
  test("rejects user outside age range", () => {
    const scheme  = makeScheme({ eligibility: "Applicant must be 18-25 years" });
    const profile = makeProfile({ age: 35 });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(false);
    expect(result.missing.some(m => m.includes("35"))).toBe(true);
  });

  test("accepts user within age range", () => {
    const scheme  = makeScheme({ eligibility: "Applicant must be 18-60 years" });
    const profile = makeProfile({ age: 30 });
    const result  = checkEligibility(scheme, profile);
    expect(result.passed).toBe(true);
  });

  test("gives partial score when age not provided", () => {
    const scheme  = makeScheme({ eligibility: "Above 18 years" });
    const profile = makeProfile({ age: 0 });
    const result  = checkEligibility(scheme, profile);
    expect(result.missing.some(m => m.toLowerCase().includes("age"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkEligibility — score range
// ─────────────────────────────────────────────────────────────────────────────

describe("checkEligibility — score", () => {
  test("score is between 0 and 1", () => {
    const { score } = checkEligibility(makeScheme(), makeProfile());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test("perfect match produces score > 0.7", () => {
    const scheme  = makeScheme({ level: "Central", state: "Central", gender_constraint: "any", eligibility: "All Indian farmers above 18 years" });
    const profile = makeProfile({ age: 30, gender: "male", occupation: "farmer" });
    const { score } = checkEligibility(scheme, profile);
    expect(score).toBeGreaterThan(0.7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// compatibilityEngine — adaptive domain weights
// ─────────────────────────────────────────────────────────────────────────────

describe("detectSchemeDomain", () => {
  test("detects scholarship domain", () => {
    const scheme = makeScheme({ name: "National Merit Scholarship", brief_description: "scholarship for students" });
    expect(detectSchemeDomain(scheme)).toBe("scholarship");
  });

  test("detects pension domain", () => {
    const scheme = makeScheme({ name: "Old Age Pension Scheme", brief_description: "monthly pension for senior citizens" });
    expect(detectSchemeDomain(scheme)).toBe("pension");
  });

  test("detects loan domain", () => {
    const scheme = makeScheme({ name: "MUDRA Loan", brief_description: "micro credit for small businesses" });
    expect(detectSchemeDomain(scheme)).toBe("loan");
  });

  test("falls back to default domain", () => {
    const scheme = makeScheme({ name: "General Welfare Scheme", brief_description: "support for citizens" });
    expect(detectSchemeDomain(scheme)).toBe("default");
  });
});

describe("educationCompatibilityScore", () => {
  test("engineering → science gets partial credit 0.6", () => {
    const score = educationCompatibilityScore("B.Tech Engineering", "for science students only");
    expect(score).toBe(0.6);
  });

  test("exact match engineering → engineering = 1.0", () => {
    const score = educationCompatibilityScore("B.Tech Engineering", "for engineering graduates");
    expect(score).toBe(1.0);
  });

  test("no education provided returns 1.0 (no penalty)", () => {
    const score = educationCompatibilityScore("", "any graduate may apply");
    expect(score).toBe(1.0);
  });
});

describe("computeCompatibility — adaptive weights", () => {
  test("scholarship scheme uses higher eligibility weight", () => {
    const scheme = makeScheme({ name: "Merit Scholarship", brief_description: "scholarship for students", eligibility: "Open to all" });
    const { domain, breakdown } = computeCompatibility(scheme, 0.8, 0.5, 0.8, {});
    expect(domain).toBe("scholarship");
    // elig weight is 0.65 for scholarship — demographic contribution should be ~0.8*0.65 = 0.52
    expect(breakdown.demographic).toBeCloseTo(0.52, 1);
  });

  test("finalScore is clamped between 0 and 1", () => {
    const { finalScore } = computeCompatibility(makeScheme(), 1, 1, 1, {});
    expect(finalScore).toBeGreaterThanOrEqual(0);
    expect(finalScore).toBeLessThanOrEqual(1);
  });

  test("passesThreshold is boolean", () => {
    const { passesThreshold } = computeCompatibility(makeScheme(), 0.8, 0.8, 0.8, {});
    expect(typeof passesThreshold).toBe("boolean");
  });
});

describe("getCategoryThreshold", () => {
  test("research category has 0.70 threshold", () => {
    const scheme = makeScheme({ category: "Research & Innovation" });
    expect(getCategoryThreshold(scheme)).toBe(0.70);
  });

  test("default category has 0 threshold (no gate)", () => {
    const scheme = makeScheme({ category: "Agriculture" });
    expect(getCategoryThreshold(scheme)).toBe(0.00);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// explainabilityEngine — star ratings & reason codes
// ─────────────────────────────────────────────────────────────────────────────

describe("buildStarRating", () => {
  test("score >= 0.85 → 5 stars Highly Recommended", () => {
    const { stars, label } = buildStarRating(0.9);
    expect(stars).toBe("★★★★★");
    expect(label).toBe("Highly Recommended");
  });

  test("score >= 0.70 → 4 stars Strongly Recommended", () => {
    const { stars } = buildStarRating(0.75);
    expect(stars).toBe("★★★★☆");
  });

  test("score < 0.40 → 1 star Low Match", () => {
    const { label } = buildStarRating(0.2);
    expect(label).toBe("Low Match");
  });

  test("pct is a rounded integer", () => {
    const { pct } = buildStarRating(0.876);
    expect(pct).toBe(88);
  });
});

describe("buildExplanation", () => {
  test("includes starRating in output", () => {
    const scheme  = makeScheme();
    const elig    = { passed: true, score: 0.9, reasons: ["Central scheme — available across India"], missing: [] };
    const breakdown = { demographic: 0.36, semantic: 0.25, intent: 0.12, govtPriority: 0.06, eduFactor: 1.0, domain: "default", weights: { demographic: 0.4, semantic: 0.35, intent: 0.15, govtPriority: 0.1 } };
    const result  = buildExplanation(scheme, elig, breakdown, 0.87, "agriculture", "agriculture", makeProfile());
    expect(result).toHaveProperty("starRating");
    expect(result.starRating).toContain("★");
  });

  test("includes reasonCodes array", () => {
    const scheme  = makeScheme();
    const elig    = { passed: true, score: 0.9, reasons: ["Central scheme — available across India"], missing: [] };
    const breakdown = { demographic: 0.36, semantic: 0.25, intent: 0.12, govtPriority: 0.06, eduFactor: 1.0, domain: "default", weights: {} };
    const result  = buildExplanation(scheme, elig, breakdown, 0.87, "agriculture", "agriculture", makeProfile());
    expect(Array.isArray(result.reasonCodes)).toBe(true);
    expect(result.reasonCodes.includes("CENTRAL_SCHEME")).toBe(true);
  });

  test("includes markdownSummary string", () => {
    const scheme  = makeScheme();
    const elig    = { passed: true, score: 0.8, reasons: ["Central scheme — available across India"], missing: [] };
    const breakdown = { demographic: 0.32, semantic: 0.2, intent: 0.1, govtPriority: 0.06, eduFactor: 1.0, domain: "default", weights: {} };
    const result  = buildExplanation(scheme, elig, breakdown, 0.75, "agriculture", "agriculture", makeProfile());
    expect(typeof result.markdownSummary).toBe("string");
    expect(result.markdownSummary.length).toBeGreaterThan(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// profileCompletenessEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("computeProfileCompleteness", () => {
  test("empty profile has low completeness and is cold-start", () => {
    const { completeness, isColdStart } = computeProfileCompleteness({});
    expect(completeness).toBeLessThan(50);
    expect(isColdStart).toBe(true);
  });

  test("full profile has high completeness and is not cold-start", () => {
    const fullProfile = {
      age: 25, gender: "female", state: "Karnataka", occupation: "student",
      annualIncome: 150000, education: "B.Tech", caste: "obc",
      goal: ["scholarship"], disability: false, minority: false,
    };
    const { completeness, isColdStart } = computeProfileCompleteness(fullProfile);
    expect(completeness).toBeGreaterThanOrEqual(90);
    expect(isColdStart).toBe(false);
  });

  test("returns filledFields and missingFields arrays", () => {
    const { filledFields, missingFields } = computeProfileCompleteness({ age: 30, gender: "male" });
    expect(filledFields).toContain("age");
    expect(filledFields).toContain("gender");
    expect(missingFields).toContain("state");
  });
});

describe("buildProfileQuery", () => {
  test("uses userQuery when provided and long enough", () => {
    const q = buildProfileQuery({ occupation: "farmer" }, "scholarship for engineering students");
    expect(q).toBe("scholarship for engineering students");
  });

  test("builds query from profile when no userQuery", () => {
    const q = buildProfileQuery({ occupation: "farmer", state: "Karnataka" }, "");
    expect(q).toContain("farmer");
    expect(q).toContain("Karnataka");
  });

  test("falls back to generic query for empty profile", () => {
    const q = buildProfileQuery({}, "");
    expect(q.length).toBeGreaterThan(0);
  });
});

describe("generateAuditId", () => {
  test("generates unique IDs", () => {
    const id1 = generateAuditId();
    const id2 = generateAuditId();
    expect(id1).not.toBe(id2);
  });

  test("starts with 'audit_'", () => {
    expect(generateAuditId()).toMatch(/^audit_\d+_[a-z0-9]+$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildGroundTruthBlock & toFrontendSchemes
// ─────────────────────────────────────────────────────────────────────────────

describe("buildGroundTruthBlock", () => {
  test("returns empty string for empty array", () => {
    expect(buildGroundTruthBlock([])).toBe("");
  });

  test("includes scheme name in output", () => {
    expect(buildGroundTruthBlock([makeScheme({ name: "PM-KISAN" })])).toContain("PM-KISAN");
  });

  test("includes all required fields", () => {
    const block = buildGroundTruthBlock([makeScheme()]);
    ["Name", "Category", "Benefits", "Eligibility", "Apply At"].forEach(f => expect(block).toContain(f));
  });

  test("numbers each scheme", () => {
    const block = buildGroundTruthBlock([makeScheme(), makeScheme({ name: "B", slug: "b" })]);
    expect(block).toContain("[Scheme 1]");
    expect(block).toContain("[Scheme 2]");
  });

  test("wraps with verified header/footer", () => {
    const block = buildGroundTruthBlock([makeScheme()]);
    expect(block).toContain("VERIFIED SCHEME DATABASE");
    expect(block).toContain("===END===");
  });
});

describe("toFrontendSchemes", () => {
  test("maps id to slug", () => {
    const [out] = toFrontendSchemes([makeScheme({ slug: "pm-kisan" })]);
    expect(out.id).toBe("pm-kisan");
  });

  test("includes required frontend fields", () => {
    const [out] = toFrontendSchemes([makeScheme()]);
    ["name", "brief_description", "benefits", "eligibility", "category", "level", "state", "application_url"]
      .forEach(f => expect(out).toHaveProperty(f));
  });

  test("strips nlp_corpus from output", () => {
    const [out] = toFrontendSchemes([makeScheme({ nlp_corpus: "huge text blob" })]);
    expect(out).not.toHaveProperty("nlp_corpus");
  });

  test("handles empty array", () => {
    expect(toFrontendSchemes([])).toEqual([]);
  });
});
