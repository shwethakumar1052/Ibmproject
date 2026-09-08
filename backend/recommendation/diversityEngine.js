/**
 * GovMatch AI — Diversity Engine
 * Caps results: max 5 per department, max 8 per category.
 * Preserves the highest-scoring representative from each bucket.
 */

const MAX_PER_DEPT     = 5;
const MAX_PER_CATEGORY = 8;

/**
 * Apply diversity caps to a ranked list of result objects.
 * Each result must have { scheme: { department, category }, finalScore }.
 * Returns the filtered, still-ranked list.
 *
 * @param {Array} rankedResults  sorted descending by finalScore
 * @returns {Array}
 */
function applyDiversity(rankedResults) {
  const deptCount     = {};
  const categoryCount = {};
  const filtered      = [];

  for (const result of rankedResults) {
    const dept = (result.scheme.department || result.scheme.ministry || "Unknown").toLowerCase();
    const cat  = (result.scheme.category || "General").toLowerCase();

    deptCount[dept]     = deptCount[dept]     || 0;
    categoryCount[cat]  = categoryCount[cat]  || 0;

    if (deptCount[dept] >= MAX_PER_DEPT)         continue;
    if (categoryCount[cat] >= MAX_PER_CATEGORY)  continue;

    deptCount[dept]++;
    categoryCount[cat]++;
    filtered.push(result);
  }

  return filtered;
}

module.exports = { applyDiversity };
