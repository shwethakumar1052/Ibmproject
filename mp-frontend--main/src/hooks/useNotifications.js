/**
 * useNotifications — custom React hook
 *
 * Connects to ws://<host>/ws/notifications (Vite proxies to backend:5001)
 * Falls back to REST GET /api/notifications on mount.
 *
 * Exposes:
 *   { notifications, unreadCount, activeToast,
 *     isConnected, wsStatus, markAsRead, clearAll, dismissToast }
 *
 * wsStatus: "connecting" | "live" | "polling"
 *   - "connecting" — first connection attempt in progress (show spinner)
 *   - "live"       — WebSocket open and healthy
 *   - "polling"    — WS failed; UI still works via REST fallback
 */

import { useState, useEffect, useRef, useCallback } from "react";

const WS_PATH = "/ws/notifications";

// Reconnect: 1st retry instant, then cap at 10 s
function nextDelay(attempt) {
  if (attempt === 0) return 0;
  return Math.min(1000 * 2 ** (attempt - 1), 10_000);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [activeToast,   setActiveToast]   = useState(null);
  const [wsStatus,      setWsStatus]      = useState("connecting"); // "connecting"|"live"|"polling"
  const wsRef       = useRef(null);
  const attemptRef  = useRef(0);
  const timerRef    = useRef(null);
  const unmountRef  = useRef(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;
  const isConnected = wsStatus === "live";

  // ── REST fallback on mount (populate before WS finishes) ─────────────────
  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      })
      .catch(() => {});
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (unmountRef.current) return;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url   = `${proto}://${window.location.host}${WS_PATH}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountRef.current) { ws.close(); return; }
        attemptRef.current = 0;
        setWsStatus("live");
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);

          if (msg.type === "INIT") {
            if (Array.isArray(msg.data)) setNotifications(msg.data);
            return;
          }
          if (msg.type === "NOTIFICATION") {
            const notif = msg.data;
            setNotifications(prev => {
              if (prev.find(n => n.id === notif.id)) return prev;
              return [notif, ...prev].slice(0, 100);
            });
            setActiveToast(notif);
            return;
          }
          if (msg.type === "UPDATE") {
            if (Array.isArray(msg.data)) setNotifications(msg.data);
          }
        } catch { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (unmountRef.current) return;
        setWsStatus("polling");
        const delay = nextDelay(attemptRef.current++);
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => { ws.close(); };

    } catch {
      // WebSocket not available at all
      setWsStatus("polling");
    }
  }, []);

  useEffect(() => {
    unmountRef.current = false;
    connect();
    return () => {
      unmountRef.current = true;
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback((id = "all") => {
    setNotifications(prev =>
      prev.map(n => (id === "all" || n.id === id) ? { ...n, read: true } : n)
    );
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "MARK_READ", id }));
    } else {
      fetch("/api/notifications/mark-read", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      }).catch(() => {});
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    fetch("/api/notifications/clear", { method: "POST" }).catch(() => {});
  }, []);

  const dismissToast = useCallback(() => setActiveToast(null), []);

  return {
    notifications,
    unreadCount,
    activeToast,
    isConnected,
    wsStatus,
    markAsRead,
    clearAll,
    dismissToast,
  };
}
