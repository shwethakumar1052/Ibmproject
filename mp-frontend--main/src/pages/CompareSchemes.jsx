import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, X, ExternalLink } from "lucide-react";

const COMPARE_FIELDS = [
  { key: "category",            label: "Category" },
  { key: "level",               label: "Level" },
  { key: "state",               label: "State" },
  { key: "ministry",            label: "Ministry" },
  { key: "benefits",            label: "Key Benefits" },
  { key: "eligibility",         label: "Eligibility" },
  { key: "application_process", label: "Application Mode" },
  { key: "open_date",           label: "Open Date" },
  { key: "close_date",          label: "Close Date" },
];

const DOCS = ["Aadhaar Card", "Income Certificate", "Caste Certificate", "Bank Account", "Address Proof", "Photograph"];

export default function CompareSchemes() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("govmatch_compare") || "[]"); }
    catch { return []; }
  });

  function remove(slug) {
    const updated = schemes.filter(s => s.slug !== slug);
    setSchemes(updated);
    localStorage.setItem("govmatch_compare", JSON.stringify(updated));
  }

  if (schemes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto glass-card p-12 text-center flex flex-col items-center gap-4 page-enter">
        <span className="text-4xl">📊</span>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>No schemes to compare</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Go to Search or Results and add up to 3 schemes using the Compare button.
        </p>
        <button onClick={() => navigate("/search")} className="btn-primary">Browse Schemes</button>
      </div>
    );
  }

  return (
    <motion.div className="page-enter flex flex-col gap-5"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs mb-1"
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={13} /> Back
          </button>
          <h1 className="text-2xl font-bold gradient-text">Compare Schemes</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Side-by-side comparison of up to 3 schemes</p>
        </div>
        <button onClick={() => navigate("/search")} className="btn-ghost text-sm">+ Add More</button>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: "600px" }}>
          {/* Header row — scheme names */}
          <thead>
            <tr>
              <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider w-36"
                  style={{ color: "var(--text-muted)", background: "var(--bg-secondary)", borderRadius: "12px 0 0 0" }}>
                Criteria
              </th>
              {schemes.map(s => (
                <th key={s.slug} className="p-4 text-left"
                    style={{ background: "rgba(99,102,241,0.06)", borderLeft: "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.ministry}</p>
                    </div>
                    <button onClick={() => remove(s.slug)} className="shrink-0 mt-0.5"
                            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {COMPARE_FIELDS.map((field, fi) => (
              <tr key={field.key} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="p-4 text-xs font-semibold" style={{
                  color: "var(--text-secondary)",
                  background: "var(--bg-secondary)",
                  verticalAlign: "top"
                }}>
                  {field.label}
                </td>
                {schemes.map(s => (
                  <td key={s.slug} className="p-4 text-sm" style={{
                    color: "var(--text-secondary)",
                    borderLeft: "1px solid var(--border)",
                    verticalAlign: "top",
                    background: fi % 2 === 0 ? "var(--bg-card)" : "transparent"
                  }}>
                    {s[field.key] || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}

            {/* Documents row */}
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td className="p-4 text-xs font-semibold" style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)", verticalAlign: "top" }}>
                Documents Required
              </td>
              {schemes.map(s => (
                <td key={s.slug} className="p-4" style={{ borderLeft: "1px solid var(--border)", verticalAlign: "top" }}>
                  <ul className="flex flex-col gap-1">
                    {DOCS.map(d => (
                      <li key={d} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--success)" }}>✓</span>{d}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Apply links row */}
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td className="p-4 text-xs font-semibold" style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)" }}>
                Apply
              </td>
              {schemes.map(s => (
                <td key={s.slug} className="p-4" style={{ borderLeft: "1px solid var(--border)" }}>
                  {s.application_url ? (
                    <a href={s.application_url} target="_blank" rel="noopener noreferrer"
                       className="btn-primary flex items-center gap-1.5 text-xs w-fit px-3 py-1.5">
                      Apply <ExternalLink size={11} />
                    </a>
                  ) : <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
