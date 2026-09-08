/**
 * NotificationBell — navbar bell icon with live WS panel
 *
 * Features:
 * - Unread badge with pulse ring
 * - Live / Polling connection indicator
 * - Filter tabs: All | New Schemes | Updates | Deadlines
 * - Mark all read / Clear all
 * - Relative timestamps
 * - Color-coded type badges
 * - Link to search scheme
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, CheckCheck, Trash2, Wifi, WifiOff, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotifications } from "../hooks/useNotifications";
import NotificationToast from "./NotificationToast";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const TYPE_META = {
  NEW_SCHEME:           { label: "New",      color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  ELIGIBILITY_UPDATED:  { label: "Eligible", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  APPLICATION_DEADLINE: { label: "Deadline", color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  SCHEME_UPDATED:       { label: "Update",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  SCHEME_ARCHIVED:      { label: "Archived", color: "#6b7280", bg: "rgba(107,114,128,0.12)"},
};

const FILTER_TABS = [
  { key: "ALL",                  label: "All"         },
  { key: "NEW_SCHEME",           label: "New Schemes" },
  { key: "SCHEME_UPDATED",       label: "Updates"     },
  { key: "APPLICATION_DEADLINE", label: "Deadlines"   },
];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, activeToast,
    isConnected, wsStatus, markAsRead, clearAll, dismissToast,
  } = useNotifications();

  const [open,      setOpen]      = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered list
  const filtered = activeTab === "ALL"
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  function handleOpen() {
    setOpen(v => !v);
  }

  function handleMarkAll() {
    markAsRead("all");
  }

  function goToScheme(schemeName) {
    if (schemeName) navigate(`/search?q=${encodeURIComponent(schemeName)}`);
    setOpen(false);
  }

  return (
    <>
      {/* ── Toast ── */}
      <AnimatePresence>
        {activeToast && (
          <NotificationToast
            notification={activeToast}
            onDismiss={dismissToast}
          />
        )}
      </AnimatePresence>

      {/* ── Bell button ── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={handleOpen}
          className="relative btn-ghost p-2 rounded-lg"
          aria-label="Notifications"
        >
          <Bell size={16} />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <>
              {/* Pulse ring */}
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping"
                    style={{ background: "rgba(239,68,68,0.4)" }} />
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center
                               rounded-full text-white"
                    style={{ background: "var(--danger)", fontSize: "0.6rem", fontWeight: 700, zIndex: 1 }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          )}
        </button>

        {/* ── Panel ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute right-0 mt-2 z-50 overflow-hidden flex flex-col"
              style={{
                width: "340px",
                maxHeight: "480px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
              }}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0"
                   style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Notifications
                  </span>
                  {/* Live indicator — 3 states */}
                  {wsStatus === "live" && (
                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                      <Wifi size={10} /> Live
                    </span>
                  )}
                  {wsStatus === "connecting" && (
                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                      <Loader2 size={10} className="animate-spin" /> Connecting
                    </span>
                  )}
                  {wsStatus === "polling" && (
                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                      <WifiOff size={10} /> Polling
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAll} title="Mark all read"
                      className="p-1 rounded" style={{ color: "var(--accent)" }}>
                      <CheckCheck size={14} />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={clearAll} title="Clear all"
                      className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 px-3 py-2 shrink-0 overflow-x-auto"
                   style={{ borderBottom: "1px solid var(--border)" }}>
                {FILTER_TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
                    style={{
                      background: activeTab === tab.key ? "var(--accent)" : "var(--bg-secondary)",
                      color:      activeTab === tab.key ? "#fff" : "var(--text-secondary)",
                      fontWeight: activeTab === tab.key ? 600 : 400,
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification list */}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center gap-2">
                    <Bell size={28} style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      No notifications yet
                    </p>
                    {!isConnected && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Connecting to live updates…
                      </p>
                    )}
                  </div>
                ) : (
                  filtered.map(n => {
                    const meta = TYPE_META[n.type] || TYPE_META.SCHEME_UPDATED;
                    return (
                      <div key={n.id}
                        className="px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors"
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: n.read ? "transparent" : "rgba(99,102,241,0.04)",
                        }}
                        onClick={() => { markAsRead(n.id); goToScheme(n.schemeName); }}>

                        {/* Unread dot */}
                        <div className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                             style={{ background: n.read ? "var(--border)" : meta.color }} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {/* Type badge */}
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                            {/* Priority badge */}
                            {n.priority === "high" && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold leading-snug"
                             style={{ color: "var(--text-primary)" }}>
                            {n.title}
                          </p>
                          <p className="text-xs mt-0.5 line-clamp-2"
                             style={{ color: "var(--text-secondary)" }}>
                            {n.message}
                          </p>
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            {relativeTime(n.timestamp)}
                            {n.schemeName && (
                              <span className="ml-2" style={{ color: "var(--accent)" }}>
                                View scheme →
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
