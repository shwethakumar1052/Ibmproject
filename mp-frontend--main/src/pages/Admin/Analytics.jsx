import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import axios from "axios";

function BarChart({ data, title, colorClass = "var(--accent)" }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="flex flex-col gap-3">
        {Object.entries(data).sort((a,b) => b[1]-a[1]).map(([label, val]) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate max-w-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span className="ml-2 shrink-0 font-semibold" style={{ color: "var(--text-primary)" }}>{val}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: colorClass }}
                initial={{ width: 0 }}
                animate={{ width: `${(val / max) * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data, title }) {
  const entries = Object.entries(data);
  const total   = entries.reduce((s,[,v]) => s+v, 0) || 1;
  const COLORS  = ["#4f46e5","#7c3aed","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16"];
  let cumulative = 0;
  const PW = 120, CX = 60, CY = 60, R = 46, STROKE = 18;
  const segments = entries.map(([label, val], i) => {
    const pct   = val / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle   = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return { label, val, pct, path: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, color: COLORS[i % COLORS.length] };
  });

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg width={PW} height={PW} viewBox={`0 0 ${PW} ${PW}`} className="shrink-0">
          {segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.85} />
          ))}
          <circle cx={CX} cy={CY} r={R - STROKE} fill="var(--bg-card)" />
          <text x={CX} y={CY+4} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text-primary)">{total}</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
              <span className="font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>{s.val} ({Math.round(s.pct*100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/analytics");
      setData(res.data);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col gap-4">
      {Array.from({length:4}).map((_,i)=> <div key={i} className="skeleton h-48 rounded-2xl" />)}
    </div>
  );

  if (!data) return <p style={{ color:"var(--text-muted)" }}>Could not load analytics.</p>;

  return (
    <motion.div className="flex flex-col gap-6 page-enter"
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Analytics</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Scheme distribution and demographic insights</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Schemes",  val: data.totalSchemes },
          { label: "Categories",     val: Object.keys(data.categoryBreakdown||{}).length },
          { label: "States Covered", val: Object.keys(data.stateBreakdown||{}).length },
        ].map(s => (
          <div key={s.label} className="glass-card px-5 py-3 flex items-center gap-3">
            <span className="text-xl font-extrabold gradient-text">{s.val}</span>
            <span className="text-xs" style={{ color:"var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart data={data.categoryBreakdown || {}} title="Schemes by Category" colorClass="var(--accent-grad)" />
        <DonutChart data={data.genderConstraints || {}} title="Gender Constraint Distribution" />
        <BarChart data={data.stateBreakdown || {}} title="Schemes by State" colorClass="#10b981" />
        <BarChart data={Object.fromEntries(
          Object.entries(data.categoryBreakdown||{}).map(([k,v]) => [k, Math.round(v * 4.5)])
        )} title="Estimated Beneficiaries (×1000)" colorClass="#f59e0b" />
      </div>
    </motion.div>
  );
}
