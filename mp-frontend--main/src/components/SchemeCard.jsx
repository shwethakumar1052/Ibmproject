import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, PlusSquare, CheckSquare, ExternalLink, Building2, MapPin } from "lucide-react";

const CATEGORY_CLASS = {
  "Education & Learning":              "badge-education",
  "Agriculture, Rural & Environment":  "badge-agriculture",
  "Health & Wellness":                 "badge-health",
  "Business & Entrepreneurship":       "badge-business",
  "Skills & Employment":               "badge-skills",
  "Women Empowerment":                 "badge-women",
  "Social Welfare":                    "badge-welfare",
};

// Circular progress ring for match score
function MatchRing({ score = 0 }) {
  const pct    = Math.round(score * 100);
  const radius = 22;
  const circ   = 2 * Math.PI * radius;
  const dash   = circ * (pct / 100);
  const color  = pct >= 70 ? "#10b981" : pct >= 45 ? "#f59e0b" : "#6366f1";

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
        <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Match</span>
    </div>
  );
}

export default function SchemeCard({ scheme = {}, score = 0, explanation = {}, onCompare, isComparing, onViewDetails, listMode = false }) {
  const [bookmarked, setBookmarked] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    return saved.includes(scheme.slug);
  });

  function toggleBookmark(e) {
    e.stopPropagation();
    const saved = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    const updated = bookmarked
      ? saved.filter(s => s !== scheme.slug)
      : [...saved, scheme.slug];
    localStorage.setItem("bookmarks", JSON.stringify(updated));
    setBookmarked(!bookmarked);
  }

  const catClass  = CATEGORY_CLASS[scheme.category] || "badge-welfare";
  const levelClass = scheme.level?.toLowerCase() === "central" ? "badge-central" : "badge-state";
  const confidence = explanation?.confidence || "";
  const benefits   = (scheme.benefits || scheme.brief_description || "").split(";")[0]?.trim();
  const whyList    = explanation?.whyRecommended || [];

  if (listMode) {
    return (
      <motion.div
        className="glass-card flex flex-row items-center gap-4 p-4"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}>

        {/* Left: name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge ${catClass}`}>{scheme.category}</span>
            <span className={`badge ${levelClass}`}>{scheme.level || "Central"}</span>
            {scheme.state && scheme.state !== "Central" && (
              <span className="badge text-xs" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                <MapPin size={9} /> {scheme.state}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-snug"
              style={{ color: "var(--text-primary)" }} title={scheme.name}>
            {scheme.name}
          </h3>
          {benefits && (
            <p className="text-xs mt-1 line-clamp-1" style={{ color: "var(--text-muted)" }}>{benefits}</p>
          )}
        </div>

        {/* Right: score + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {score > 0 && <MatchRing score={score} />}
          <button onClick={toggleBookmark} className="p-1.5 rounded-lg"
                  style={{ color: bookmarked ? "var(--accent)" : "var(--text-muted)" }}>
            {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
          {onCompare && (
            <button onClick={() => onCompare(scheme)} className="p-1.5 rounded-lg"
                    style={{ color: isComparing ? "var(--accent)" : "var(--text-muted)" }}
                    title={isComparing ? "Remove from compare" : "Add to compare"}>
              {isComparing ? <CheckSquare size={15} /> : <PlusSquare size={15} />}
            </button>
          )}
          <button onClick={() => onViewDetails?.(scheme)}
                  className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
            View <ExternalLink size={11} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="glass-card flex flex-col gap-3 p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}>

      {/* ── Header row ── */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug truncate"
              style={{ color: "var(--text-primary)" }} title={scheme.name}>
            {scheme.name}
          </h3>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <Building2 size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span className="text-xs truncate" style={{ color: "var(--text-muted)", maxWidth: "200px" }}>
              {scheme.ministry || scheme.department || "Ministry"}
            </span>
          </div>
        </div>
        {score > 0 && <MatchRing score={score} />}
      </div>

      {/* ── Badges ── */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`badge ${catClass}`}>{scheme.category}</span>
        <span className={`badge ${levelClass}`}>{scheme.level || "Central"}</span>
        {scheme.state && scheme.state !== "Central" && (
          <span className="badge" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            <MapPin size={9} /> {scheme.state}
          </span>
        )}
      </div>

      {/* ── Key benefit ── */}
      {benefits && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
          {benefits}
        </p>
      )}

      {/* ── Why recommended pill (top reason) ── */}
      {whyList.length > 0 && (
        <div className="flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
             style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)" }}>
          <span>✓</span>
          <span className="line-clamp-1">{whyList[0]}</span>
        </div>
      )}

      {/* ── Confidence badge ── */}
      {confidence && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: confidence === "High Match" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                  color: confidence === "High Match" ? "var(--success)" : "var(--warning)"
                }}>
            {confidence}
          </span>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 mt-auto pt-1 border-t" style={{ borderColor: "var(--border)" }}>
        <button onClick={toggleBookmark} className="p-1.5 rounded-lg transition-colors"
                style={{ color: bookmarked ? "var(--accent)" : "var(--text-muted)" }}
                aria-label="Bookmark">
          {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>

        {onCompare && (
          <button onClick={() => onCompare(scheme)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: isComparing ? "var(--accent)" : "var(--text-muted)" }}
                  title={isComparing ? "Remove from compare" : "Add to compare"}
                  aria-label="Compare">
            {isComparing ? <CheckSquare size={16} /> : <PlusSquare size={16} />}
          </button>
        )}

        <div className="flex-1" />

        <button onClick={() => onViewDetails?.(scheme)}
                className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
          View Details
          <ExternalLink size={11} />
        </button>
      </div>
    </motion.div>
  );
}
