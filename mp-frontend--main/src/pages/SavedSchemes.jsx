import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, Trash2, ExternalLink } from "lucide-react";
import axios from "axios";
import { SchemeGridSkeleton } from "../components/Loader";

export default function SavedSchemes() {
  const navigate = useNavigate();
  const [schemes,  setSchemes]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const slugs = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    if (!slugs.length) { setLoading(false); return; }
    Promise.all(slugs.map(slug => axios.get(`/api/schemes/${slug}`).then(r => r.data).catch(() => null)))
      .then(results => setSchemes(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, []);

  function remove(slug) {
    const saved = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    localStorage.setItem("bookmarks", JSON.stringify(saved.filter(s => s !== slug)));
    setSchemes(prev => prev.filter(s => s.slug !== slug));
  }

  return (
    <motion.div className="flex flex-col gap-6 page-enter"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

      <div>
        <h1 className="text-2xl font-bold gradient-text">Saved Schemes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {schemes.length} bookmarked scheme{schemes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? <SchemeGridSkeleton count={3} /> : schemes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-4">
          <Bookmark size={36} style={{ color: "var(--text-muted)" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No saved schemes yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Browse schemes and click the bookmark icon to save them here.</p>
          <button onClick={() => navigate("/search")} className="btn-primary">Browse Schemes</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {schemes.map(s => (
            <div key={s.slug} className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--text-primary)" }}>{s.name}</h3>
                <button onClick={() => remove(s.slug)} className="shrink-0 p-1"
                        style={{ color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{s.brief_description}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="badge badge-central">{s.level}</span>
                <span className="badge badge-education text-xs">{s.category}</span>
              </div>
              <div className="flex gap-2 mt-auto pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => navigate(`/scheme/${s.slug}`)} className="btn-ghost text-xs flex items-center gap-1.5 flex-1 justify-center">
                  View Details <ExternalLink size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
