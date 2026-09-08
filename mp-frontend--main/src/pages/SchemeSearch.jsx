import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, LayoutGrid, List, X, SlidersHorizontal, GitCompare } from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import SchemeCard from "../components/SchemeCard";
import { SchemeGridSkeleton } from "../components/Loader";

const COMPARE_KEY = "govmatch_compare";
const MAX_COMPARE = 3;

const CATEGORIES = ["Education & Learning","Agriculture, Rural & Environment","Health & Wellness","Business & Entrepreneurship","Skills & Employment","Women Empowerment","Social Welfare"];
const STATES = ["Central","Karnataka","Maharashtra","Tamil Nadu","Delhi","Uttar Pradesh","Bihar","Gujarat","Rajasthan","West Bengal","Kerala","Punjab","Haryana","Telangana","Andhra Pradesh"];
const LEVELS = ["Central","State"];
const GENDERS = ["any","female_only"];
const CASTES = ["general","obc","sc","st","minority"];

export default function SchemeSearch() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query,    setQuery]    = useState(searchParams.get("q") || "");
  const [schemes,  setSchemes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [view,     setView]     = useState("grid");   // "grid" | "list"
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Compare state — synced with localStorage
  const [compareList, setCompareList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]"); }
    catch { return []; }
  });

  function toggleCompare(scheme) {
    setCompareList(prev => {
      const exists = prev.find(s => s.slug === scheme.slug);
      let updated;
      if (exists) {
        updated = prev.filter(s => s.slug !== scheme.slug);
      } else {
        if (prev.length >= MAX_COMPARE) return prev; // max 3
        updated = [...prev, scheme];
      }
      localStorage.setItem(COMPARE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    state:    "",
    level:    "",
    gender:   "",
  });

  const fetchSchemes = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 12 });
      if (query)           params.set("search", query);
      if (filters.category) params.set("category", filters.category);
      if (filters.state)   params.set("state", filters.state);
      if (filters.level)   params.set("level", filters.level);
      const res = await axios.get(`/api/schemes?${params}`);
      setSchemes(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPage(pg);
    } catch { setSchemes([]); }
    finally { setLoading(false); }
  }, [query, filters]);

  useEffect(() => { fetchSchemes(1); }, [filters]);

  // Debounced query search
  useEffect(() => {
    const t = setTimeout(() => fetchSchemes(1), 350);
    return () => clearTimeout(t);
  }, [query]);

  function clearFilter(key) { setFilters(f => ({ ...f, [key]: "" })); }

  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-6 page-enter">
      {/* ── Search header ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFiltersOpen(v => !v)} className="btn-ghost flex items-center gap-2 text-sm">
            <SlidersHorizontal size={15} />
            {t("filters")} {activeFilters.length > 0 && <span className="badge-education badge text-xs px-1.5">{activeFilters.length}</span>}
          </button>
          <button onClick={() => setView("grid")} className={`btn-ghost p-2.5 ${view === "grid" ? "border-indigo-400" : ""}`}
                  style={{ color: view === "grid" ? "var(--accent)" : "var(--text-muted)" }} title={t("grid_view")}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setView("list")} className={`btn-ghost p-2.5 ${view === "list" ? "border-indigo-400" : ""}`}
                  style={{ color: view === "list" ? "var(--accent)" : "var(--text-muted)" }} title={t("list_view")}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ── Filter sidebar (collapsible on mobile) ── */}
      <div className="flex gap-6">
        {filtersOpen && (
          <motion.aside className="w-56 shrink-0 flex flex-col gap-4"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            {[
              { key: "category", label: "Category",  options: CATEGORIES },
              { key: "state",    label: "State",      options: STATES },
              { key: "level",    label: "Level",      options: LEVELS },
            ].map(({ key, label, options }) => (
              <div key={key} className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>{label}</p>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {options.map(opt => (
                    <button key={opt} onClick={() => setFilters(f => ({ ...f, [key]: f[key] === opt ? "" : opt }))}
                      className="text-xs text-left px-2 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: filters[key] === opt ? "rgba(99,102,241,0.1)" : "transparent",
                        color: filters[key] === opt ? "var(--accent)" : "var(--text-secondary)",
                        fontWeight: filters[key] === opt ? 600 : 400
                      }}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
          </motion.aside>
        )}

        {/* ── Main results ── */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>
                  {val}
                  <button onClick={() => clearFilter(key)}><X size={11} /></button>
                </span>
              ))}
              <button onClick={() => setFilters({ category:"",state:"",level:"",gender:"" })}
                className="text-xs px-2 py-1 rounded-full" style={{ color: "var(--danger)" }}>
                {t("clear_all")}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {loading ? t("searching") : `${total} ${t("schemes_found")}`}
            </p>
          </div>

          {loading ? <SchemeGridSkeleton count={6} /> : (
            <>
              <div className={view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                : "flex flex-col gap-4"}>
                {schemes.length === 0 ? (
                  <div className="col-span-3 glass-card p-10 text-center">
                    <p style={{ color: "var(--text-muted)" }}>{t("no_schemes_found")}</p>
                  </div>
                ) : schemes.map(s => (
                  <div key={s.slug} className={view === "list" ? "w-full" : ""}>
                    <SchemeCard
                      scheme={s}
                      listMode={view === "list"}
                      onCompare={toggleCompare}
                      isComparing={!!compareList.find(c => c.slug === s.slug)}
                      onViewDetails={scheme => navigate(`/scheme/${scheme.slug}`)}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total > 12 && (
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => fetchSchemes(p)}
                      className="w-8 h-8 rounded-lg text-xs font-medium"
                      style={{
                        background: page === p ? "var(--accent-grad)" : "var(--bg-secondary)",
                        color: page === p ? "#fff" : "var(--text-secondary)"
                      }}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Compare tray — fixed bottom bar when items selected ── */}
      {compareList.length > 0 && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl"
          style={{ transform: "translateX(-50%)", background: "var(--accent-grad)", color: "#fff", minWidth: "320px" }}
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
          <GitCompare size={18} />
          <span className="text-sm font-semibold flex-1">
            {compareList.length} scheme{compareList.length > 1 ? "s" : ""} selected
            {compareList.length < MAX_COMPARE && <span className="opacity-70 text-xs ml-1">(max {MAX_COMPARE})</span>}
          </span>
          <div className="flex gap-2 items-center">
            {compareList.map(s => (
              <span key={s.slug} className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs max-w-[90px] truncate">
                {s.name}
                <button onClick={() => toggleCompare(s)} className="opacity-70 hover:opacity-100 ml-0.5">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate("/compare")}
            className="bg-white text-indigo-600 font-bold text-xs px-3 py-1.5 rounded-lg">
            Compare →
          </button>
        </motion.div>
      )}
    </div>
  );
}
