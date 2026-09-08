import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Database, Search, RefreshCw, Users } from "lucide-react";
import axios from "axios";

function StatCard({ icon, label, value, color = "var(--accent)", loading }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        {loading
          ? <div className="skeleton h-7 w-16 mb-1" />
          : <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{value}</p>}
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/analytics");
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const cats    = data?.categoryBreakdown  || {};
  const states  = data?.stateBreakdown     || {};
  const audit   = data?.recentAuditLog     || [];
  const total   = data?.totalSchemes       || 0;
  const cacheSize = data?.pipeline?.cache?.size ?? "—";

  return (
    <motion.div className="flex flex-col gap-6 page-enter"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>System overview and live metrics</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Database size={20} />}    label="Total Schemes"     value={total}     loading={loading} />
        <StatCard icon={<TrendingUp size={20} />}  label="Categories"        value={Object.keys(cats).length} loading={loading} color="#10b981" />
        <StatCard icon={<Search size={20} />}      label="Recommendation Requests" value={audit.filter(a => a.event === "recommendation").length} loading={loading} color="#f59e0b" />
        <StatCard icon={<Users size={20} />}       label="Pipeline Cache Entries" value={cacheSize} loading={loading} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Category Breakdown</h2>
          {loading ? (
            <div className="flex flex-col gap-2">{Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-5 rounded" />)}</div>
          ) : Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([cat, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={cat} className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                  <span className="truncate">{cat}</span>
                  <span className="shrink-0 ml-2">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent-grad)", transition: "width 0.6s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* State distribution */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>State Distribution</h2>
          {loading ? (
            <div className="flex flex-col gap-2">{Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-5 rounded" />)}</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {Object.entries(states).sort((a,b) => b[1]-a[1]).map(([state, count]) => (
                <div key={state} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg"
                     style={{ background: "var(--bg-secondary)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{state}</span>
                  <span className="badge badge-central">{count} scheme{count!==1?"s":""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit log */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Recent Activity Log</h2>
        {audit.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "500px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Timestamp","Event","Query","Intent","Returned","Elapsed"].map(h => (
                    <th key={h} className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.slice(0,15).map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-1.5 pr-4" style={{ color: "var(--text-muted)" }}>{new Date(a.timestamp).toLocaleTimeString()}</td>
                    <td className="py-1.5 pr-4"><span className="badge badge-central">{a.event}</span></td>
                    <td className="py-1.5 pr-4 max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>{a.query || "—"}</td>
                    <td className="py-1.5 pr-4" style={{ color: "var(--text-secondary)" }}>{a.userIntent || "—"}</td>
                    <td className="py-1.5 pr-4" style={{ color: "var(--text-secondary)" }}>{a.returned ?? "—"}</td>
                    <td className="py-1.5" style={{ color: "var(--text-secondary)" }}>{a.elapsedMs != null ? `${a.elapsedMs}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
