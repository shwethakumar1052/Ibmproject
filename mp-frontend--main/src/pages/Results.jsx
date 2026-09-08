import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, ChevronUp, ExternalLink, ArrowLeft, Filter } from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import SchemeCard from "../components/SchemeCard";
import { SchemeGridSkeleton } from "../components/Loader";
import { downloadBulkReport } from "../services/pdfService";

const CONFIDENCE_ORDER = { "High Match": 0, "Good Match": 1, "Partial Match": 2, "Low Match": 3 };

function XAIAccordion({ explanation = {} }) {
  const [open, setOpen] = useState(false);
  if (!explanation.whyRecommended?.length) return null;
  return (
    <div className="border-t mt-3 pt-3" style={{ borderColor: "var(--border)" }}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-xs font-semibold"
        style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
        <span>Why this scheme matches you</span>{/* XAI label — not translated here; translated in Results component below */}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 flex flex-col gap-3">
              {explanation.whyRecommended?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--success)" }}>✓ Matched Criteria</p>
                  <ul className="flex flex-col gap-1">
                    {explanation.whyRecommended.map((r, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--success)", marginTop: 1 }}>•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.missingInfo?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--warning)" }}>⚠ Criteria Needed / Optional</p>
                  <ul className="flex flex-col gap-1">
                    {explanation.missingInfo.map((m, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--warning)", marginTop: 1 }}>•</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.scoreBreakdown && (
                <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Score Breakdown</p>
                  {Object.entries({
                    "Demographic": explanation.scoreBreakdown.demographic,
                    "Semantic NLP": explanation.scoreBreakdown.semantic,
                    "Intent Match": explanation.scoreBreakdown.intent,
                    "Govt Priority": explanation.scoreBreakdown.govtPriority,
                  }).map(([label, val]) => (
                    <div key={label} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs w-24 shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (val / 0.40) * 100)}%`, background: "var(--accent-grad)" }} />
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: "var(--text-muted)" }}>{((val / (explanation.scoreBreakdown.demographic + explanation.scoreBreakdown.semantic + explanation.scoreBreakdown.intent + explanation.scoreBreakdown.govtPriority)) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({ item, onCompare, isComparing, onViewDetails }) {
  const { scheme, finalScore = 0, explanation = {} } = item;
  return (
    <div className="glass-card p-5 flex flex-col gap-0">
      <SchemeCard scheme={scheme} score={finalScore} explanation={explanation}
        onCompare={onCompare} isComparing={isComparing} onViewDetails={onViewDetails} />
      <XAIAccordion explanation={explanation} />
    </div>
  );
}

export default function Results() {
  const { t } = useTranslation();
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [filter, setFilter]       = useState("all");
  const [compare, setCompare]     = useState([]);
  const navigate                  = useNavigate();

  const profile = JSON.parse(localStorage.getItem("govmatch_profile") || "{}");

  useEffect(() => {
    async function load() {
      if (!Object.keys(profile).length) { setLoading(false); return; }
      try {
        const query = [profile.occupation, ...(profile.goal || [])].filter(Boolean).join(" ");
        const res = await axios.post("/api/recommend", { profile, query, topN: 20 });
        const sorted = (res.data.recommendations || [])
          .sort((a, b) => (CONFIDENCE_ORDER[a.explanation?.confidence] ?? 9) - (CONFIDENCE_ORDER[b.explanation?.confidence] ?? 9));
        setResults(sorted);
      } catch (e) {
        setError("Could not load recommendations. Please try again.");
      } finally { setLoading(false); }
    }
    load();
  }, []);

  function toggleCompare(scheme) {
    setCompare(prev => {
      if (prev.find(s => s.slug === scheme.slug)) return prev.filter(s => s.slug !== scheme.slug);
      if (prev.length >= 3) return prev;
      return [...prev, scheme];
    });
  }

  function exportPDF() {
    downloadBulkReport(results, profile);
  }

  const filtered = filter === "all" ? results
    : results.filter(r => (r.explanation?.confidence || "").toLowerCase().startsWith(filter));

  if (loading) return <div className="max-w-4xl mx-auto"><SchemeGridSkeleton count={6} /></div>;
  if (error)   return <div className="max-w-4xl mx-auto glass-card p-8 text-center" style={{ color: "var(--danger)" }}>{error}</div>;
  if (!Object.keys(profile).length) {
    return (
      <div className="max-w-2xl mx-auto glass-card p-10 text-center flex flex-col items-center gap-4">
        <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("no_profile_title")}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("no_profile_sub")}</p>
        <button onClick={() => navigate("/assess")} className="btn-primary">{t("start_assessment")}</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto page-enter flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate("/assess")} className="flex items-center gap-1.5 text-xs mb-2"
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={13} /> {t("back_to_assessment")}
          </button>
          <h1 className="text-2xl font-bold gradient-text">{t("results_title")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t("results_sub", { count: results.length, state: profile.state || "All States", occupation: profile.occupation || "All Occupations" })}
          </p>
        </div>
        <div className="flex gap-2">
          {compare.length > 0 && (
            <button onClick={() => { localStorage.setItem("govmatch_compare", JSON.stringify(compare)); navigate("/compare"); }}
              className="btn-ghost text-sm flex items-center gap-1.5">
              {t("btn_compare")} ({compare.length})
            </button>
          )}
          <button onClick={exportPDF} className="btn-primary flex items-center gap-2 text-sm">
            <Download size={14} /> {t("btn_export_pdf")}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["all", t("filter_all")],["high", t("filter_high")],["good", t("filter_good")],["partial", t("filter_partial")]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className="text-xs px-3 py-1.5 rounded-full font-medium border transition-all"
            style={{
              background: filter === val ? "var(--accent-grad)" : "var(--bg-secondary)",
              color: filter === val ? "#fff" : "var(--text-secondary)",
              border: filter === val ? "none" : "1px solid var(--border)"
            }}>{label}</button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p style={{ color: "var(--text-muted)" }}>{t("no_results_filter")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item, i) => (
            <motion.div key={item.scheme?.slug || i}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <ResultCard item={item}
                onCompare={() => toggleCompare(item.scheme)}
                isComparing={compare.some(s => s.slug === item.scheme?.slug)}
                onViewDetails={s => navigate(`/scheme/${s.slug}`)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
