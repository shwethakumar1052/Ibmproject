import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Save, X, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import axios from "axios";

const EMPTY = { name:"", category:"", level:"Central", state:"Central", ministry:"", brief_description:"", eligibility:"", benefits:"", application_url:"" };

function SchemeRow({ scheme, onEdit, onDelete, onBoost, onHide, overrides }) {
  const isBoost = overrides.boostSlugs?.includes(scheme.slug);
  const isHide  = overrides.hideSlugs?.includes(scheme.slug);
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td className="py-2 px-3 text-xs font-medium max-w-xs truncate" style={{ color: "var(--text-primary)" }}>{scheme.name}</td>
      <td className="py-2 px-3 text-xs" style={{ color: "var(--text-muted)" }}><span className="badge badge-education">{scheme.category}</span></td>
      <td className="py-2 px-3 text-xs" style={{ color: "var(--text-muted)" }}>{scheme.level}</td>
      <td className="py-2 px-3 text-xs" style={{ color: "var(--text-muted)" }}>{scheme.state}</td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(scheme)} className="p-1 rounded" title="Edit"
                  style={{ color: "var(--accent)", background:"none", border:"none", cursor:"pointer" }}><Pencil size={13} /></button>
          <button onClick={() => onBoost(scheme.slug)} className="p-1 rounded" title={isBoost ? "Remove boost" : "Boost"}
                  style={{ color: isBoost ? "#f59e0b" : "var(--text-muted)", background:"none", border:"none", cursor:"pointer" }}>
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onHide(scheme.slug)} className="p-1 rounded" title={isHide ? "Unhide" : "Hide"}
                  style={{ color: isHide ? "var(--danger)" : "var(--text-muted)", background:"none", border:"none", cursor:"pointer" }}>
            <ChevronDown size={13} />
          </button>
          <button onClick={() => onDelete(scheme.slug)} className="p-1 rounded" title="Delete"
                  style={{ color: "var(--danger)", background:"none", border:"none", cursor:"pointer" }}><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  );
}

function EditModal({ scheme, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...scheme });
  const fields = ["name","category","level","state","ministry","brief_description","eligibility","benefits","application_url"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm gradient-text">{scheme.slug ? "Edit Scheme" : "Add Scheme"}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)" }}><X size={16} /></button>
        </div>
        {fields.map(f => (
          <div key={f}>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{f.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</label>
            <textarea rows={f.includes("description")||f.includes("eligibility")||f.includes("benefits") ? 3 : 1}
              value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
              style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", color:"var(--text-primary)" }} />
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <button onClick={() => onSave(form)} className="btn-primary flex items-center gap-2 text-sm"><Save size={13} /> Save</button>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ManageSchemes() {
  const [schemes, setSchemes]   = useState([]);
  const [overrides, setOverrides] = useState({ boostSlugs:[], hideSlugs:[] });
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [search, setSearch]     = useState("");
  const [msg, setMsg]           = useState("");

  async function load() {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        axios.get("/api/schemes?limit=200"),
        axios.get("/api/admin/overrides")
      ]);
      setSchemes(s.data.data || []);
      setOverrides(o.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function saveOverrides(updated) {
    await axios.post("/api/admin/overrides", updated);
    setOverrides(updated);
  }

  function toggleBoost(slug) {
    const b = overrides.boostSlugs || [];
    saveOverrides({ ...overrides, boostSlugs: b.includes(slug) ? b.filter(s=>s!==slug) : [...b, slug] });
  }

  function toggleHide(slug) {
    const h = overrides.hideSlugs || [];
    saveOverrides({ ...overrides, hideSlugs: h.includes(slug) ? h.filter(s=>s!==slug) : [...h, slug] });
  }

  function handleDelete(slug) {
    if (!confirm(`Delete scheme "${slug}"?`)) return;
    // Client-side only — in production this would call a DELETE endpoint
    setSchemes(prev => prev.filter(s => s.slug !== slug));
    setMsg(`Deleted ${slug} (client-side). Re-run import_dataset.py to persist.`);
    setTimeout(() => setMsg(""), 4000);
  }

  function handleSave(form) {
    if (editing?.slug) {
      setSchemes(prev => prev.map(s => s.slug === editing.slug ? { ...s, ...form } : s));
    } else {
      const newSlug = form.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40);
      setSchemes(prev => [{ ...form, slug: newSlug, id: Date.now() }, ...prev]);
    }
    setEditing(null);
    setMsg("Saved (client-side). Use /api/admin/reload after updating backend JSON.");
    setTimeout(() => setMsg(""), 4000);
  }

  async function reloadBackend() {
    await axios.post("/api/admin/reload");
    setMsg("Backend schemes reloaded.");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  const visible = schemes.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div className="flex flex-col gap-5 page-enter"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Manage Schemes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{schemes.length} total schemes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setEditing({})} className="btn-primary flex items-center gap-2 text-sm"><Plus size={14}/> Add Scheme</button>
          <button onClick={reloadBackend} className="btn-ghost flex items-center gap-2 text-sm"><RefreshCw size={13}/> Reload Backend</button>
        </div>
      </div>

      {msg && <div className="px-4 py-2.5 rounded-xl text-xs" style={{ background:"rgba(16,185,129,0.1)", color:"var(--success)" }}>{msg}</div>}

      <div className="glass-card p-1">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schemes…"
          className="w-full px-4 py-2.5 text-sm outline-none rounded-xl"
          style={{ background:"transparent", border:"none", color:"var(--text-primary)" }} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth:"600px" }}>
            <thead style={{ background:"var(--bg-secondary)" }}>
              <tr>
                {["Name","Category","Level","State","Actions"].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold" style={{ color:"var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:6}).map((_,i) => (
                  <tr key={i}><td colSpan={5} className="py-2 px-3"><div className="skeleton h-4 rounded" /></td></tr>
                ))
              ) : visible.map(s => (
                <SchemeRow key={s.slug} scheme={s} onEdit={setEditing} onDelete={handleDelete}
                  onBoost={toggleBoost} onHide={toggleHide} overrides={overrides} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && <EditModal scheme={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </motion.div>
  );
}
