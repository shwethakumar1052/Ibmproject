/**
 * NotificationToast — bottom-right animated toast
 *
 * Features:
 * - Slide in from bottom-right (framer-motion)
 * - 6-second countdown progress bar (auto-dismiss)
 * - Type icon + color-coded header
 * - "View Scheme" button navigates to /search?q=<schemeName>
 * - Manual dismiss on × click
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Bell, BookOpen, Clock, RefreshCw, Archive } from "lucide-react";

// --------------------------------------------------------------------------
// Type config
// --------------------------------------------------------------------------
const TYPE_CONFIG = {
  NEW_SCHEME:           { icon: BookOpen,  color: "#10b981", label: "New Scheme"     },
  ELIGIBILITY_UPDATED:  { icon: Bell,      color: "#6366f1", label: "Eligibility"    },
  APPLICATION_DEADLINE: { icon: Clock,     color: "#ef4444", label: "Deadline Alert" },
  SCHEME_UPDATED:       { icon: RefreshCw, color: "#f59e0b", label: "Update"         },
  SCHEME_ARCHIVED:      { icon: Archive,   color: "#6b7280", label: "Archived"       },
};

const DURATION_MS  = 6000;
const TICK_MS      = 50;

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
export default function NotificationToast({ notification, onDismiss }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100); // 100 → 0 over DURATION_MS
  const intervalRef = useRef(null);

  const cfg  = TYPE_CONFIG[notification?.type] || TYPE_CONFIG.SCHEME_UPDATED;
  const Icon = cfg.icon;

  // Countdown timer
  useEffect(() => {
    if (!notification) return;
    setProgress(100);

    const step = (TICK_MS / DURATION_MS) * 100;
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          onDismiss?.();
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(intervalRef.current);
  }, [notification, onDismiss]);

  if (!notification) return null;

  function handleView() {
    if (notification.schemeName) {
      navigate(`/search?q=${encodeURIComponent(notification.schemeName)}`);
    }
    onDismiss?.();
  }

  return (
    <motion.div
      className="fixed z-[1000] flex flex-col overflow-hidden"
      style={{
        bottom: "24px",
        right:  "24px",
        width:  "320px",
        background:   "var(--bg-card)",
        border:       `1px solid ${cfg.color}40`,
        borderRadius: "var(--radius)",
        boxShadow:    "0 8px 32px rgba(0,0,0,0.18)",
      }}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      {/* Progress bar */}
      <div style={{ height: "3px", background: "var(--border)" }}>
        <div style={{
          height:     "100%",
          width:      `${progress}%`,
          background: cfg.color,
          transition: `width ${TICK_MS}ms linear`,
        }} />
      </div>

      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
             style={{ background: `${cfg.color}18` }}>
          <Icon size={16} style={{ color: cfg.color }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs font-semibold leading-snug"
             style={{ color: "var(--text-primary)" }}>
            {notification.title}
          </p>
          <p className="text-xs mt-0.5 line-clamp-2"
             style={{ color: "var(--text-secondary)" }}>
            {notification.message}
          </p>
        </div>

        {/* Dismiss */}
        <button onClick={onDismiss} className="shrink-0 mt-0.5"
                style={{ color: "var(--text-muted)" }}>
          <X size={14} />
        </button>
      </div>

      {/* View Scheme button */}
      {notification.schemeName && (
        <div className="px-4 pb-3">
          <button onClick={handleView}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg w-full"
            style={{
              background: `${cfg.color}14`,
              color:       cfg.color,
              border:     `1px solid ${cfg.color}30`,
            }}>
            View Scheme →
          </button>
        </div>
      )}
    </motion.div>
  );
}
