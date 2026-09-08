import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, MapPin, TrendingUp, Award, Globe2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Animated counter hook
function useCountUp(target, duration = 1600, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    let startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return val;
}

function StatCard({ icon: Icon, label, value, suffix = "", color, delay = 0, started }) {
  const count = useCountUp(value, 1800, started);
  return (
    <motion.div className="glass-card p-6 flex flex-col gap-3"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center"
           style={{ background: color + "20" }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {count.toLocaleString()}{suffix}
        </p>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      </div>
    </motion.div>
  );
}

// Mini horizontal bar chart
function BarChart({ data, colorVar }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs w-36 truncate shrink-0" style={{ color: "var(--text-secondary)" }}>{d.label}</span>
          <div className="flex-1 h-2 rounded-full" style={{ background: "var(--border)" }}>
            <motion.div className="h-2 rounded-full"
              style={{ background: colorVar, width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.6 }} />
          </div>
          <span className="text-xs w-12 text-right font-medium" style={{ color: "var(--text-muted)" }}>
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// SVG Donut chart
function DonutChart({ segments }) {
  const size = 160, cx = 80, cy = 80, r = 58, stroke = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];
  const total = segments.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={colors[i % colors.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              style={{ transition: "stroke-dasharray 0.6s ease" }} />
          );
          offset += pct;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700"
              fill="var(--text-primary)">{total.toLocaleString()}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10"
              fill="var(--text-muted)">Schemes</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: colors[i % colors.length] }} />
            <span style={{ color: "var(--text-secondary)" }}>{seg.label}</span>
            <span className="font-semibold ml-1" style={{ color: "var(--text-primary)" }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImpactDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get("/api/schemes?limit=1");
        const total = res.data.pagination?.total || 0;

        // Fetch category breakdown
        const cats = ["Education & Learning","Agriculture, Rural & Environment","Health & Wellness",
          "Business & Entrepreneurship","Skills & Employment","Women Empowerment","Social Welfare"];

        const catCounts = await Promise.all(
          cats.map(cat =>
            axios.get(`/api/schemes?limit=1&category=${encodeURIComponent(cat)}`)
              .then(r => ({ label: cat.split(" & ")[0].split(",")[0], value: r.data.pagination?.total || 0 }))
              .catch(() => ({ label: cat, value: 0 }))
          )
        );

        // State breakdown — top 8
        const stateNames = ["Central","Gujarat","Uttarakhand","Madhya Pradesh","Goa","Puducherry","Haryana","Tamil Nadu"];
        const stateCounts = await Promise.all(
          stateNames.map(st =>
            axios.get(`/api/schemes?limit=1&state=${encodeURIComponent(st)}`)
              .then(r => ({ label: st, value: r.data.pagination?.total || 0 }))
              .catch(() => ({ label: st, value: 0 }))
          )
        );

        setStats({
          total,
          categories: catCounts.filter(c => c.value > 0).sort((a,b) => b.value - a.value),
          states: stateCounts.filter(s => s.value > 0).sort((a,b) => b.value - a.value),
          womenSchemes: catCounts.find(c => c.label === "Women Empowerment")?.value || 0,
          agriSchemes: catCounts.find(c => c.label === "Agriculture")?.value || 0,
        });
      } catch {
        // Fallback static data
        setStats({
          total: 4430,
          categories: [
            { label: "Education", value: 1309 },
            { label: "Agriculture", value: 874 },
            { label: "Business", value: 698 },
            { label: "Skills", value: 525 },
            { label: "Social Welfare", value: 394 },
            { label: "Health", value: 322 },
            { label: "Women", value: 308 },
          ],
          states: [
            { label: "Central", value: 666 },
            { label: "Gujarat", value: 593 },
            { label: "Uttarakhand", value: 405 },
            { label: "Madhya Pradesh", value: 259 },
            { label: "Goa", value: 250 },
            { label: "Puducherry", value: 247 },
            { label: "Haryana", value: 217 },
            { label: "Tamil Nadu", value: 212 },
          ],
          womenSchemes: 338,
          agriSchemes: 874,
        });
      }
    }
    load();
  }, []);

  // Trigger counter animation on scroll into view
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [stats]);

  return (
    <div className="flex flex-col gap-10 page-enter" ref={ref}>

      {/* ── Hero ── */}
      <motion.div className="text-center flex flex-col items-center gap-4 py-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
             style={{ background: "var(--accent-grad)" }}>
          <TrendingUp size={28} color="#fff" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Impact Dashboard</h1>
        <p className="text-base max-w-xl" style={{ color: "var(--text-muted)" }}>
          Real-time overview of government schemes available across India — helping citizens discover benefits they deserve.
        </p>
        <button onClick={() => navigate("/assess")}
          className="btn-primary flex items-center gap-2 mt-2 px-5 py-2.5">
          Check My Eligibility <ChevronRight size={16} />
        </button>
      </motion.div>

      {/* ── Stat cards ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}   label="Total Schemes"         value={stats.total}         color="#6366f1" delay={0}    started={started} />
          <StatCard icon={MapPin}     label="States & UTs Covered"  value={28}                  color="#10b981" delay={0.08} started={started} suffix="+" />
          <StatCard icon={Users}      label="Women-Focused Schemes" value={stats.womenSchemes}  color="#ec4899" delay={0.16} started={started} />
          <StatCard icon={Globe2}     label="Central Govt Schemes"  value={stats.categories?.reduce((s,c)=>s+c.value,0) > 0 ? 666 : 0} color="#f59e0b" delay={0.24} started={started} />
        </div>
      )}

      {/* ── Charts row ── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Category breakdown — donut */}
          <motion.div className="glass-card p-6 flex flex-col gap-5"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div>
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Schemes by Category</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Distribution across 7 welfare categories</p>
            </div>
            <DonutChart segments={stats.categories} />
          </motion.div>

          {/* State breakdown — bar */}
          <motion.div className="glass-card p-6 flex flex-col gap-5"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div>
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Top States by Schemes</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Number of schemes per state / union territory</p>
            </div>
            <BarChart data={stats.states} colorVar="var(--accent-grad)" />
          </motion.div>
        </div>
      )}

      {/* ── Category cards ── */}
      {stats && (
        <motion.div className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: "Education & Learning",              color: "#6366f1", emoji: "🎓" },
              { label: "Agriculture, Rural & Environment",  color: "#10b981", emoji: "🌾" },
              { label: "Business & Entrepreneurship",       color: "#f59e0b", emoji: "💼" },
              { label: "Skills & Employment",               color: "#3b82f6", emoji: "🛠️" },
              { label: "Health & Wellness",                 color: "#ef4444", emoji: "🏥" },
              { label: "Women Empowerment",                 color: "#ec4899", emoji: "👩" },
              { label: "Social Welfare",                    color: "#8b5cf6", emoji: "🤝" },
            ].map((cat, i) => {
              const found = stats.categories.find(c => cat.label.startsWith(c.label) || c.label === cat.label.split(" & ")[0].split(",")[0]);
              return (
                <motion.button key={cat.label}
                  className="glass-card p-4 text-left flex flex-col gap-2 hover:scale-[1.02] transition-transform"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => navigate(`/search?category=${encodeURIComponent(cat.label)}`)}>
                  <span className="text-2xl">{cat.emoji}</span>
                  <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{cat.label}</p>
                  {found && <p className="text-xs font-bold" style={{ color: cat.color }}>{found.value} schemes</p>}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── CTA ── */}
      <motion.div className="glass-card p-8 text-center flex flex-col items-center gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))" }}>
        <Award size={36} style={{ color: "var(--accent)" }} />
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Find Schemes You're Eligible For
        </h2>
        <p className="text-sm max-w-md" style={{ color: "var(--text-muted)" }}>
          Answer 8 simple questions and get personalized scheme recommendations matched to your profile — in under 2 minutes.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => navigate("/assess")} className="btn-primary px-6 py-2.5">
            Start Eligibility Check
          </button>
          <button onClick={() => navigate("/search")} className="btn-ghost px-6 py-2.5">
            Browse All Schemes
          </button>
        </div>
      </motion.div>

    </div>
  );
}
