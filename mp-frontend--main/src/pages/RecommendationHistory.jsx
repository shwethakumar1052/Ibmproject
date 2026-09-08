import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { History, Trash2, ArrowRight } from "lucide-react";

const HISTORY_KEY = "govmatch_history";

export function saveToHistory(profile, count) {
  const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const entry = { id: Date.now(), profile, count, date: new Date().toISOString() };
  const updated = [entry, ...prev].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export default function RecommendationHistory() {
  const navigate  = useNavigate();
  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
  );

  function deleteEntry(id) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  function clearAll() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  function rerun(profile) {
    localStorage.setItem("govmatch_profile", JSON.stringify(profile));
    navigate("/results");
  }

  return (
    <motion.div className="max-w-2xl mx-auto flex flex-col gap-6 page-enter"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Recommendation History</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {history.length} past recommendation{history.length !== 1 ? "s" : ""}
          </p>
        </div>
        {history.length > 0 && (
          <button onClick={clearAll} className="btn-ghost text-xs flex items-center gap-1.5"
                  style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-4">
          <History size={36} style={{ color: "var(--text-muted)" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No history yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Complete the eligibility questionnaire to see your history here.</p>
          <button onClick={() => navigate("/assess")} className="btn-primary">Start Assessment</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map(h => (
            <div key={h.id} className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "rgba(99,102,241,0.1)" }}>
                <History size={18} style={{ color: "var(--accent)" }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {h.count ?? "?"} schemes matched
                  </span>
                  <span className="badge badge-central">{h.profile?.state || "All States"}</span>
                  {h.profile?.occupation && (
                    <span className="badge badge-skills">{h.profile.occupation}</span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {new Date(h.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Age: {h.profile?.age || "—"} · Gender: {h.profile?.gender || "—"} · Caste: {h.profile?.caste || "—"}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button onClick={() => rerun(h.profile)}
                  className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
                  Re-run <ArrowRight size={12} />
                </button>
                <button onClick={() => deleteEntry(h.id)} className="btn-ghost p-2"
                        style={{ color: "var(--danger)" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
