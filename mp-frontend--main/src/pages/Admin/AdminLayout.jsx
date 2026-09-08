import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Database, Upload, BarChart2, Settings, ChevronLeft, Shield, LogOut } from "lucide-react";

const ADMIN_KEY = "govmatch_admin";

const NAV = [
  { to: "/admin",           icon: <LayoutDashboard size={16} />, label: "Dashboard",      end: true },
  { to: "/admin/schemes",   icon: <Database size={16} />,        label: "Manage Schemes" },
  { to: "/admin/upload",    icon: <Upload size={16} />,          label: "Upload Dataset" },
  { to: "/admin/analytics", icon: <BarChart2 size={16} />,       label: "Analytics" },
];

// Simple admin auth gate — hardcoded for demo (replace with real auth in production)
const ADMIN_CREDENTIALS = { username: "admin", password: "govmatch2024" };

export function AdminLogin({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  function handle(e) {
    e.preventDefault();
    if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
      localStorage.setItem(ADMIN_KEY, "1");
      onLogin();
    } else {
      setErr("Invalid credentials. Try admin / govmatch2024");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="glass-card p-8 w-full max-w-sm flex flex-col gap-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-grad)" }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Admin Portal</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>GovMatch AI</p>
          </div>
        </div>
        <form onSubmit={handle} className="flex flex-col gap-3">
          <input value={u} onChange={e => setU(e.target.value)} placeholder="Username"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <input value={p} onChange={e => setP(e.target.value)} placeholder="Password" type="password"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>{err}</p>}
          <button type="submit" className="btn-primary w-full py-2.5">Sign In to Admin</button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(ADMIN_KEY) === "1");
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  function logout() {
    localStorage.removeItem(ADMIN_KEY);
    setAuthed(false);
    navigate("/");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside className="flex flex-col shrink-0 border-r transition-all"
             style={{ width: collapsed ? "56px" : "200px", borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
               style={{ background: "var(--accent-grad)" }}>A</div>
          {!collapsed && <span className="text-sm font-bold gradient-text">Admin</span>}
          <button onClick={() => setCollapsed(v => !v)} className="ml-auto p-1"
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <ChevronLeft size={14} style={{ transform: collapsed ? "rotate(180deg)" : "", transition: "0.2s" }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors"
              style={({ isActive }) => ({
                background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none"
              })}>
              <span className="shrink-0">{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={logout}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm w-full transition-colors"
            style={{ color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
