import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle2, Users } from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";

const STEPS = [
  { title: "Basic Info",          subtitle: "Tell us about yourself" },
  { title: "Location",            subtitle: "Where are you located?" },
  { title: "Occupation",          subtitle: "What do you do?" },
  { title: "Annual Income",       subtitle: "Family income range" },
  { title: "Education",           subtitle: "Highest qualification" },
  { title: "Social Category",     subtitle: "Caste / community" },
  { title: "Special Categories",  subtitle: "Any additional criteria" },
  { title: "Primary Goal",        subtitle: "What are you looking for?" },
];

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

const INITIAL = {
  age: "", gender: "",
  state: "", district: "", area: "",
  occupation: "", employmentStatus: "",
  annualIncome: "",
  education: "",
  caste: "", minority: false,
  disability: false, bplCard: false, isStudent: false, isWidow: false,
  goal: [],
};

// Live match counter — debounced call to /api/recommend
// Uses coverageFunnel.afterHardFilters so the number reflects ALL matching
// schemes, not just the diversity-capped top-N shown on Results page.
function useLiveMatch(profile) {
  const [matchData, setMatchData] = useState(null); // { total, topN, funnel }
  const [loading,   setLoading]   = useState(false);

  const doFetch = useCallback(async (p) => {
    try {
      setLoading(true);
      const res = await axios.post("/api/recommend", { profile: p, topN: 10 });
      const d   = res.data;
      setMatchData({
        // Total schemes that passed hard eligibility — the true "match" count
        total:    d.coverageFunnel?.afterHardFilters ?? d.count ?? 0,
        // Final top results after diversity + scoring
        topN:     d.count ?? 0,
        // Full funnel for tooltip
        funnel:   d.coverageFunnel ?? null,
        intent:   d.userIntent ?? null,
        complete: d.completeness?.completeness ?? 0,
      });
    } catch { setMatchData(null); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    // Start fetching as soon as ANY of the core fields is filled
    const hasData = profile.age || profile.gender || profile.state ||
                    profile.occupation || profile.annualIncome || profile.caste;
    if (!hasData) return;
    const t = setTimeout(() => doFetch(profile), 700);
    return () => clearTimeout(t);
  }, [profile, doFetch]);

  return { matchData, loading };
}

// ── Step components ─────────────────────────────────────────────
function Step1({ data, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Age</label>
        <input type="number" min={1} max={120} value={data.age} onChange={e => set("age", e.target.value)}
          placeholder="e.g. 28" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Gender</label>
        <div className="flex gap-3">
          {["Male","Female","Transgender"].map(g => (
            <button key={g} onClick={() => set("gender", g.toLowerCase())}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: data.gender === g.toLowerCase() ? "var(--accent-grad)" : "var(--bg-secondary)",
                color: data.gender === g.toLowerCase() ? "#fff" : "var(--text-secondary)",
                border: data.gender === g.toLowerCase() ? "none" : "1px solid var(--border)"
              }}>{g}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({ data, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>State</label>
        <select value={data.state} onChange={e => set("state", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <option value="">Select state…</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>District</label>
        <input value={data.district} onChange={e => set("district", e.target.value)}
          placeholder="e.g. Bengaluru Urban" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Area Type</label>
        <div className="flex gap-3">
          {["Rural","Urban","Semi-Urban"].map(a => (
            <button key={a} onClick={() => set("area", a)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: data.area === a ? "var(--accent-grad)" : "var(--bg-secondary)",
                color: data.area === a ? "#fff" : "var(--text-secondary)",
                border: data.area === a ? "none" : "1px solid var(--border)"
              }}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ data, set }) {
  const occupations = ["Farmer","Student","Entrepreneur","Salaried Employee","Daily Wage Worker","Unemployed","Homemaker","Self-Employed","Retired"];
  const statuses    = ["Employed","Unemployed","Part-Time","Self-Employed","Seasonal Worker"];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Occupation</label>
        <div className="grid grid-cols-2 gap-2">
          {occupations.map(o => (
            <button key={o} onClick={() => set("occupation", o)}
              className="py-2 px-3 rounded-xl text-sm text-left border transition-all"
              style={{
                background: data.occupation === o ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
                color: data.occupation === o ? "var(--accent)" : "var(--text-secondary)",
                border: data.occupation === o ? "1px solid var(--accent)" : "1px solid var(--border)",
                fontWeight: data.occupation === o ? 600 : 400
              }}>{o}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Employment Status</label>
        <div className="flex flex-wrap gap-2">
          {statuses.map(s => (
            <button key={s} onClick={() => set("employmentStatus", s)}
              className="py-1.5 px-3 rounded-lg text-xs border transition-all"
              style={{
                background: data.employmentStatus === s ? "var(--accent-grad)" : "var(--bg-secondary)",
                color: data.employmentStatus === s ? "#fff" : "var(--text-secondary)",
                border: data.employmentStatus === s ? "none" : "1px solid var(--border)"
              }}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step4({ data, set }) {
  const ranges = [
    { label: "Below ₹1 Lakh",      value: 80000 },
    { label: "₹1–2.5 Lakh",        value: 175000 },
    { label: "₹2.5–5 Lakh",        value: 375000 },
    { label: "₹5–8 Lakh",          value: 650000 },
    { label: "₹8–12 Lakh",         value: 1000000 },
    { label: "Above ₹12 Lakh",     value: 1500000 },
  ];
  return (
    <div>
      <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Annual Family Income</label>
      <div className="grid grid-cols-2 gap-3">
        {ranges.map(r => (
          <button key={r.label} onClick={() => set("annualIncome", r.value)}
            className="py-3 px-4 rounded-xl text-sm border text-left transition-all"
            style={{
              background: data.annualIncome === r.value ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
              color: data.annualIncome === r.value ? "var(--accent)" : "var(--text-secondary)",
              border: data.annualIncome === r.value ? "1px solid var(--accent)" : "1px solid var(--border)",
              fontWeight: data.annualIncome === r.value ? 600 : 400
            }}>{r.label}</button>
        ))}
      </div>
    </div>
  );
}

function Step5({ data, set }) {
  const levels = ["Below 10th","10th Pass","12th Pass","ITI / Diploma","Graduate","Post-Graduate","PhD","No Formal Education"];
  return (
    <div>
      <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Highest Education Qualification</label>
      <div className="grid grid-cols-2 gap-2">
        {levels.map(l => (
          <button key={l} onClick={() => set("education", l)}
            className="py-2.5 px-4 rounded-xl text-sm border text-left transition-all"
            style={{
              background: data.education === l ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
              color: data.education === l ? "var(--accent)" : "var(--text-secondary)",
              border: data.education === l ? "1px solid var(--accent)" : "1px solid var(--border)",
              fontWeight: data.education === l ? 600 : 400
            }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Step6({ data, set }) {
  const castes = ["General","OBC","SC","ST","Minority","EWS"];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Social Category / Caste</label>
        <div className="grid grid-cols-3 gap-3">
          {castes.map(c => (
            <button key={c} onClick={() => set("caste", c.toLowerCase())}
              className="py-2.5 px-3 rounded-xl text-sm border transition-all font-medium"
              style={{
                background: data.caste === c.toLowerCase() ? "var(--accent-grad)" : "var(--bg-secondary)",
                color: data.caste === c.toLowerCase() ? "#fff" : "var(--text-secondary)",
                border: data.caste === c.toLowerCase() ? "none" : "1px solid var(--border)"
              }}>{c}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="minority" checked={data.minority}
          onChange={e => set("minority", e.target.checked)}
          className="w-4 h-4 accent-indigo-500" />
        <label htmlFor="minority" className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Belong to a Religious Minority (Muslim, Christian, Sikh, Buddhist, Jain, Parsi)
        </label>
      </div>
    </div>
  );
}

function Step7({ data, set }) {
  const flags = [
    { key: "disability", label: "Person with Disability / Divyangjan" },
    { key: "bplCard",    label: "BPL (Below Poverty Line) Card Holder" },
    { key: "isStudent",  label: "Currently Enrolled as Student" },
    { key: "isWidow",    label: "Widow / Single Mother" },
  ];
  return (
    <div>
      <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Select all that apply</label>
      <div className="flex flex-col gap-3">
        {flags.map(f => (
          <button key={f.key} onClick={() => set(f.key, !data[f.key])}
            className="flex items-center gap-3 py-3 px-4 rounded-xl border text-left transition-all"
            style={{
              background: data[f.key] ? "rgba(99,102,241,0.1)" : "var(--bg-secondary)",
              border: data[f.key] ? "1px solid var(--accent)" : "1px solid var(--border)"
            }}>
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                 style={{ background: data[f.key] ? "var(--accent)" : "var(--border)" }}>
              {data[f.key] && <CheckCircle2 size={14} color="#fff" />}
            </div>
            <span className="text-sm" style={{ color: data[f.key] ? "var(--accent)" : "var(--text-secondary)", fontWeight: data[f.key] ? 600 : 400 }}>
              {f.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step8({ data, set }) {
  const goals = ["Financial Grant / Subsidy","Education Support","Health Insurance","Employment / Skill Training","Business Loan","Housing","Agriculture Support","Pension / Social Security"];
  function toggleGoal(g) {
    const current = data.goal || [];
    set("goal", current.includes(g) ? current.filter(x => x !== g) : [...current, g]);
  }
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Primary Goals <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Select all that apply)</span></label>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {goals.map(g => {
          const active = (data.goal || []).includes(g);
          return (
            <button key={g} onClick={() => toggleGoal(g)}
              className="py-2.5 px-3 rounded-xl text-xs border text-left transition-all"
              style={{
                background: active ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                fontWeight: active ? 600 : 400
              }}>{g}</button>
          );
        })}
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8];

// ── Main Questionnaire ──────────────────────────────────────────
export default function EligibilityQuestionnaire() {
  const { t } = useTranslation();
  const [step, setStep]       = useState(0);
  // Seed from localStorage so a returning user keeps their data,
  // and so ChatBot profile-chip updates are reflected immediately.
  const [data, setData]       = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("govmatch_profile") || "{}");
      return { ...INITIAL, ...saved };
    } catch { return INITIAL; }
  });
  const [prevTotal, setPrevTotal] = useState(null); // track direction of change
  const navigate              = useNavigate();
  const { matchData, loading } = useLiveMatch(data);

  // Track previous count so we can show ↑ / ↓ arrow
  const total = matchData?.total ?? null;
  const trend = prevTotal === null || total === null ? null
    : total > prevTotal ? "up"
    : total < prevTotal ? "down"
    : "same";

  useEffect(() => {
    if (total !== null) setPrevTotal(total);
  }, [total]);

  // Re-merge profile when ChatBot chip dispatches a storage event
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== "govmatch_profile" || !e.newValue) return;
      try {
        const incoming = JSON.parse(e.newValue);
        setData(prev => ({ ...prev, ...incoming }));
      } catch { /* ignore malformed data */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function set(key, val) { setData(prev => ({ ...prev, [key]: val })); }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else {
      localStorage.setItem("govmatch_profile", JSON.stringify(data));
      navigate("/results");
    }
  }

  const StepComp  = STEP_COMPONENTS[step];
  const progress  = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto page-enter">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main form card ── */}
        <div className="flex-1">
          {/* Progress bar */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                {t("step_of", { current: step + 1, total: STEPS.length })}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("complete_pct", { pct: Math.round(progress) })}
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "var(--accent-grad)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }} />
            </div>
            {/* Step dots */}
            <div className="flex justify-between mt-3">
              {STEPS.map((s, i) => (
                <button key={i} onClick={() => i <= step && setStep(i)}
                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all"
                  style={{
                    background: i < step ? "var(--accent)" : i === step ? "var(--accent-grad)" : "var(--bg-secondary)",
                    color: i <= step ? "#fff" : "var(--text-muted)",
                    cursor: i <= step ? "pointer" : "default"
                  }}>
                  {i < step ? "✓" : i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Step card */}
          <div className="glass-card p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <h2 className="text-lg font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {STEPS[step].title}
                </h2>
                <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                  {STEPS[step].subtitle}
                </p>
                <StepComp data={data} set={set} />
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
                className="btn-ghost flex items-center gap-2 text-sm"
                style={{ opacity: step === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> {t("btn_back")}
              </button>
              <button onClick={handleNext} className="btn-primary flex items-center gap-2 text-sm">
                {step === STEPS.length - 1 ? t("btn_find_schemes") : t("btn_continue")}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar: live match counter ── */}
        <div className="w-full lg:w-64 flex flex-col gap-4">
          <div className="glass-card p-5 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                 style={{ background: "rgba(99,102,241,0.1)" }}>
              <Users size={24} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ width: "100%" }}>
              {/* Main count */}
              <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-extrabold gradient-text">
                  {loading ? "…" : total !== null ? total.toLocaleString() : "—"}
                </p>
                {!loading && trend === "up" && (
                  <span style={{ color: "#16a34a", fontSize: 18, fontWeight: 700 }}>↑</span>
                )}
                {!loading && trend === "down" && (
                  <span style={{ color: "#dc2626", fontSize: 18, fontWeight: 700 }}>↓</span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                schemes match your profile
              </p>
              {/* Best matches line */}
              {matchData?.topN > 0 && !loading && (
                <p className="text-xs mt-1" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Top {matchData.topN} best matches ranked
                </p>
              )}
            </div>

            {/* Status pill */}
            {total !== null && !loading && (
              <p className="text-xs px-3 py-1.5 rounded-lg w-full"
                 style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                ✓ Live match — updates as you fill form
              </p>
            )}

            {/* Coverage funnel mini */}
            {matchData?.funnel && !loading && (
              <div className="w-full text-left" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  How we filter 4,430 schemes:
                </p>
                {[
                  { label: "Total schemes",        val: matchData.funnel.totalSchemes,       color: "#6b7280" },
                  { label: "After eligibility",    val: matchData.funnel.afterHardFilters,   color: "#2563eb" },
                  { label: "After scoring",        val: matchData.funnel.afterCompatibility, color: "#7c3aed" },
                  { label: "Best for you",         val: matchData.funnel.recommended,        color: "#059669" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                    <span className="text-xs font-bold" style={{ color: row.color }}>{row.val?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Intent detected */}
            {matchData?.intent && !loading && (
              <div className="w-full text-left">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Detected intent: <strong style={{ color: "var(--accent)", textTransform: "capitalize" }}>{matchData.intent}</strong>
                </p>
              </div>
            )}

            {/* Completeness bar */}
            {matchData?.complete > 0 && !loading && (
              <div className="w-full">
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Profile completeness</span>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{matchData.complete}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${matchData.complete}%`, background: "var(--accent-grad)" }} />
                </div>
              </div>
            )}
          </div>

          {/* Step overview */}
          <div className="glass-card p-4">
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>{t("your_progress")}</p>
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                     style={{ background: i < step ? "var(--success)" : i === step ? "var(--accent)" : "var(--border)" }}>
                  {i < step && <CheckCircle2 size={12} color="#fff" />}
                </div>
                <span className="text-xs" style={{
                  color: i === step ? "var(--accent)" : i < step ? "var(--success)" : "var(--text-muted)",
                  fontWeight: i === step ? 600 : 400
                }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
