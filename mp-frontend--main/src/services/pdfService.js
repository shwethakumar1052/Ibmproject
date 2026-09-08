/**
 * GovMatch AI — PDF Service
 * Generates clean, government-standard eligibility reports.
 * Uses only ASCII-safe currency formatting (Rs. X,XX,XXX) to avoid
 * Unicode glyph rendering issues in jsPDF's built-in fonts.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helpers ────────────────────────────────────────────────────

/**
 * Format a number as Indian currency string safe for PDF rendering.
 * e.g. 500000 → "Rs. 5,00,000"
 */
export function formatINR(amount) {
  if (!amount && amount !== 0) return "—";
  const num = typeof amount === "string"
    ? parseFloat(amount.replace(/[^0-9.]/g, ""))
    : amount;
  if (isNaN(num)) return String(amount).replace(/₹/g, "Rs.").replace(/\u20b9/gi, "Rs.");
  const [integer] = num.toFixed(0).split(".");
  const lastThree = integer.slice(-3);
  const rest      = integer.slice(0, -3);
  const formatted = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;
  return `Rs. ${formatted}`;
}

/**
 * Strip characters that cannot be rendered by jsPDF's built-in Helvetica font.
 * Replaces ₹ → Rs., removes other extended Unicode.
 */
function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/₹/g, "Rs.")
    .replace(/\u20b9/g, "Rs.")
    .replace(/[^\x00-\x7F]/g, "?");
}

function today() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

// ── Color palette ──────────────────────────────────────────────
const INDIGO   = [79,  70, 229];
const INDIGO_L = [224, 231, 255];
const GREEN    = [16, 185, 129];
const AMBER    = [245, 158, 11];
const GREY     = [100, 116, 139];
const LIGHT    = [248, 250, 252];

// ── Section header helper ──────────────────────────────────────
function sectionHeader(doc, title, y) {
  doc.setFillColor(...INDIGO);
  doc.rect(14, y, 182, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 17, y + 5);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return y + 11;
}

// ── Safe score breakdown helper ────────────────────────────────
// Handles both old fixed-weight and new adaptive-weight breakdowns.
function buildBreakdownRows(breakdown = {}, pct) {
  const weights = breakdown.weights || {};

  // Build rows only for components that have data
  const components = [
    { label: "Demographic Match",  key: "demographic",  w: weights.demographic  ?? 0.40 },
    { label: "Semantic NLP Match", key: "semantic",     w: weights.semantic     ?? 0.35 },
    { label: "Intent Match",       key: "intent",       w: weights.intent       ?? 0.15 },
    { label: "Govt Priority",      key: "govtPriority", w: weights.govtPriority ?? 0.10 },
  ];

  const rows = components.map(c => {
    const raw      = breakdown[c.key] ?? 0;
    const compPct  = c.w > 0 ? Math.min(100, Math.round((raw / c.w) * 100)) : 0;
    return [
      c.label,
      `${Math.round(c.w * 100)}%`,
      `${compPct}%`,
    ];
  });

  rows.push(["FINAL SCORE", "100%", `${pct}%`]);
  return rows;
}

// ── Per-scheme eligibility report ──────────────────────────────

/**
 * Generate and download a GovMatch eligibility report PDF.
 *
 * @param {object} scheme      — full scheme object from API
 * @param {object} profile     — user profile from localStorage
 * @param {object} explanation — XAI explanation object from pipeline (may be {})
 * @param {number} finalScore  — 0–1 float match score (0 if unknown)
 */
export function downloadEligibilityReport(scheme, profile = {}, explanation = {}, finalScore = 0) {
  if (!scheme) return;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW  = 210;
  const ML  = 14;
  const MR  = 196;
  const CW  = MR - ML;

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PW, 28, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(ML, 6, 16, 16, 2, 2, "F");
  doc.setTextColor(...INDIGO);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("G", ML + 5, 17);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GovMatch AI", ML + 20, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Smart Government Scheme Recommendation System", ML + 20, 18);
  doc.text("Powered by IBM watsonx.ai  |  Not affiliated with any government body", ML + 20, 23);

  doc.setTextColor(...INDIGO);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ELIGIBILITY VERIFICATION REPORT", PW / 2, 38, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(`Report Date: ${today()}`, ML, 45);
  doc.text(`Report ID: GVM-${Date.now().toString(36).toUpperCase()}`, MR, 45, { align: "right" });

  doc.setDrawColor(...INDIGO_L);
  doc.setLineWidth(0.4);
  doc.line(ML, 48, MR, 48);

  let y = 54;

  // ── 1. Scheme Overview ───────────────────────────────────────
  y = sectionHeader(doc, "1. Scheme Overview", y);

  autoTable(doc, {
    startY: y, margin: { left: ML, right: 14 },
    head: [],
    body: [
      ["Scheme Name",           sanitize(scheme.name)],
      ["Category",              sanitize(scheme.category)],
      ["Level",                 sanitize(scheme.level)],
      ["State",                 sanitize(scheme.state)],
      ["Ministry",              sanitize(scheme.ministry)],
      ["Department",            sanitize(scheme.department || "—")],
      ["Implementing Agency",   sanitize(scheme.implementing_agency || "—")],
      ["Application URL",       sanitize(scheme.application_url || "—")],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 52, fillColor: LIGHT },
      1: { cellWidth: CW - 52 },
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    theme: "plain",
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── 2. Applicant Profile ─────────────────────────────────────
  y = sectionHeader(doc, "2. Applicant Profile", y);

  autoTable(doc, {
    startY: y, margin: { left: ML, right: 14 },
    head: [],
    body: [
      ["Age",            sanitize(String(profile.age || "—"))],
      ["Gender",         sanitize(profile.gender || "—")],
      ["State",          sanitize(profile.state || "—")],
      ["District",       sanitize(profile.district || "—")],
      ["Area Type",      sanitize(profile.area || "—")],
      ["Occupation",     sanitize(profile.occupation || "—")],
      ["Annual Income",  formatINR(profile.annualIncome)],
      ["Education",      sanitize(profile.education || "—")],
      ["Caste Category", sanitize((profile.caste || "General").toUpperCase())],
      ["Disability",     profile.disability ? "Yes — Divyangjan" : "No"],
      ["BPL Card",       profile.bplCard    ? "Yes" : "No"],
      ["Widow/Single Mother", profile.isWidow ? "Yes" : "No"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 52, fillColor: LIGHT },
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    theme: "plain",
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── 3. Compatibility Score ───────────────────────────────────
  y = sectionHeader(doc, "3. Compatibility Score", y);

  const pct  = Math.round((finalScore || 0) * 100);
  const conf = explanation.starRating
    || explanation.confidence
    || (pct >= 75 ? "High Match" : pct >= 50 ? "Good Match" : "Partial Match");

  // Score bar
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, CW, 12, 2, 2, "F");
  if (pct > 0) {
    const barW     = Math.max((pct / 100) * CW, 4);
    const barColor = pct >= 70 ? GREEN : pct >= 45 ? AMBER : INDIGO;
    doc.setFillColor(...barColor);
    doc.roundedRect(ML, y, barW, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${pct}% Match`, ML + 4, y + 8);
  } else {
    doc.setTextColor(...GREY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Score not available — open from Results page for full score", ML + 4, y + 8);
  }
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(sanitize(conf), MR, y + 8, { align: "right" });

  y += 18;

  // Score breakdown table — uses adaptive weights from pipeline
  const breakdownRows = buildBreakdownRows(explanation.scoreBreakdown || {}, pct);

  autoTable(doc, {
    startY: y, margin: { left: ML, right: 14 },
    head: [["Score Component", "Weight", "Component Score"]],
    body: breakdownRows,
    headStyles:  { fillColor: INDIGO, fontSize: 8, fontStyle: "bold" },
    styles:      { fontSize: 8.5, cellPadding: 2.5 },
    theme:       "plain",
    didParseCell: (data) => {
      if (data.section === "body") {
        // Highlight FINAL SCORE row
        if (data.row.index === breakdownRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = INDIGO_L;
        } else {
          data.cell.styles.fillColor = LIGHT;
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── 4. Eligibility Criteria Checklist ───────────────────────
  y = sectionHeader(doc, "4. Eligibility Criteria Checklist", y);

  // Show reason codes if available
  const reasonCodes = explanation.reasonCodes || [];
  const whyRows  = (explanation.whyRecommended || []).map(r => ["PASS",  sanitize(r)]);
  const missRows = (explanation.missingInfo    || []).map(m => ["CHECK", sanitize(m)]);
  const allRows  = [...whyRows, ...missRows];

  if (reasonCodes.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GREY);
    doc.text(`Reason codes: ${reasonCodes.join(", ")}`, ML, y);
    y += 6;
  }

  if (allRows.length) {
    autoTable(doc, {
      startY: y, margin: { left: ML, right: 14 },
      head: [["Status", "Criteria / Note"]],
      body: allRows,
      headStyles:  { fillColor: INDIGO, fontSize: 8 },
      styles:      { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 18, fontStyle: "bold" } },
      theme: "striped",
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          data.cell.styles.textColor = data.cell.raw === "PASS" ? GREEN : AMBER;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "italic");
    doc.text("Open this scheme from the Results page for detailed eligibility breakdown.", ML, y + 5);
    y += 14;
  }

  // ── 5. Key Benefits ──────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }

  y = sectionHeader(doc, "5. Key Benefits", y);

  const benefitText = explanation.keyBenefit
    ? `${sanitize(explanation.keyBenefit)}\n\n${sanitize(scheme.benefits || "")}`
    : sanitize(scheme.benefits || "—");

  const bLines = doc.splitTextToSize(benefitText, CW);
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.text(bLines, ML, y);
  y += bLines.length * 4.5 + 6;

  // ── 6. How to Apply ──────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }

  y = sectionHeader(doc, "6. How to Apply", y);

  const applyLines = doc.splitTextToSize(
    sanitize(scheme.application_url
      ? `Apply online at: ${scheme.application_url}`
      : "Visit the nearest Common Service Centre (CSC) or the official government portal."),
    CW
  );
  doc.setFontSize(8.5);
  doc.setTextColor(...INDIGO);
  doc.text(applyLines, ML, y);
  y += applyLines.length * 5 + 8;

  // ── 7. Verification stamp ────────────────────────────────────
  if (y > 258) { doc.addPage(); y = 20; }

  doc.setFillColor(...INDIGO_L);
  doc.roundedRect(ML, y, CW, 28, 2, 2, "F");
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, 28, 2, 2, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INDIGO);
  doc.text("GENERATED BY GovMatch AI  |  Powered by IBM watsonx.ai", PW / 2, y + 9, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text("This report is for informational purposes only.", PW / 2, y + 16, { align: "center" });
  doc.text("Always verify eligibility and apply on the official government portal.", PW / 2, y + 21, { align: "center" });
  doc.text(`Generated: ${new Date().toISOString()}`, PW / 2, y + 26, { align: "center" });

  // ── Page footer ──────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(
      `GovMatch AI  |  govmatch.ai  |  Page ${p} of ${totalPages}`,
      PW / 2, 290, { align: "center" }
    );
  }

  // ── Save ─────────────────────────────────────────────────────
  const safeName = (scheme.name || "Scheme")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  doc.save(`GovMatch_Report_${safeName}.pdf`);
}

/**
 * Bulk export — all recommendations as a single PDF summary table.
 *
 * @param {Array}  recommendations  — array of { scheme, finalScore, explanation }
 * @param {object} profile          — user profile
 */
export function downloadBulkReport(recommendations = [], profile = {}) {
  if (!recommendations.length) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW  = 210;
  const ML  = 14;
  const MR  = 196;

  // Header
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("GovMatch AI — Recommended Schemes Report", PW / 2, 10, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Powered by IBM watsonx.ai  |  Smart Government Scheme Recommendation System", PW / 2, 17, { align: "center" });

  // Profile summary
  doc.setTextColor(...GREY);
  doc.setFontSize(8.5);
  const profileLine = [
    profile.state       ? `State: ${sanitize(profile.state)}`           : null,
    profile.occupation  ? `Occupation: ${sanitize(profile.occupation)}` : null,
    profile.age         ? `Age: ${profile.age}`                         : null,
    profile.caste       ? `Category: ${sanitize(profile.caste).toUpperCase()}` : null,
    `Date: ${today()}`,
  ].filter(Boolean).join("  |  ");

  doc.text(profileLine, ML, 32);

  // Main table
  autoTable(doc, {
    startY: 37, margin: { left: ML, right: 14 },
    head: [["#", "Scheme Name", "Category", "Match %", "Star Rating", "Key Benefit"]],
    body: recommendations.map((r, i) => [
      i + 1,
      sanitize(r.scheme?.name || "—"),
      sanitize(r.scheme?.category || "—"),
      `${Math.round((r.finalScore || 0) * 100)}%`,
      sanitize(r.explanation?.starRating || r.explanation?.confidence || "—"),
      sanitize(r.explanation?.keyBenefit || "—"),
    ]),
    headStyles:  { fillColor: INDIGO, fontSize: 8, fontStyle: "bold" },
    styles:      { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 52 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16 },
      4: { cellWidth: 34 },
      5: { cellWidth: MR - ML - 8 - 52 - 32 - 16 - 34 },
    },
    theme: "striped",
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const pct = parseInt(data.cell.raw);
        if (pct >= 75) data.cell.styles.textColor = GREEN;
        else if (pct >= 50) data.cell.styles.textColor = AMBER;
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Summary stats
  const avgScore = recommendations.reduce((s, r) => s + (r.finalScore || 0), 0) / recommendations.length;
  const highCount = recommendations.filter(r => (r.finalScore || 0) >= 0.75).length;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(
    `Total: ${recommendations.length} schemes  |  High Match (>=75%): ${highCount}  |  Avg Score: ${Math.round(avgScore * 100)}%`,
    ML, finalY
  );

  // Stamp
  if (finalY < 265) {
    doc.setFillColor(...INDIGO_L);
    doc.roundedRect(ML, finalY + 8, MR - ML, 18, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INDIGO);
    doc.text("GovMatch AI  |  Powered by IBM watsonx.ai", PW / 2, finalY + 16, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY);
    doc.text("For informational purposes only. Verify on official government portals.", PW / 2, finalY + 22, { align: "center" });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(`GovMatch AI  |  Page ${p} of ${totalPages}`, PW / 2, 290, { align: "center" });
  }

  doc.save(`GovMatch_Recommendations_${Date.now()}.pdf`);
}
