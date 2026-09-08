/**
 * GovMatch AI — Real-time Notification Service
 * WebSocket server + persistent JSON store + broadcast engine.
 *
 * Attaches to the existing Express HTTP server (port 5001).
 * Storage: backend/notifications/notifications.json (max 100 records)
 */

"use strict";

const { WebSocketServer, OPEN } = require("ws");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const STORE_PATH = path.join(__dirname, "notifications.json");
const MAX_RECORDS = 100;
const HEARTBEAT_INTERVAL = 30_000; // 30 s

/** @type {import("ws").WebSocketServer|null} */
let wss = null;

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------
const TYPES = {
  NEW_SCHEME:           "NEW_SCHEME",
  ELIGIBILITY_UPDATED:  "ELIGIBILITY_UPDATED",
  APPLICATION_DEADLINE: "APPLICATION_DEADLINE",
  SCHEME_UPDATED:       "SCHEME_UPDATED",
  SCHEME_ARCHIVED:      "SCHEME_ARCHIVED",
};

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/** Load notifications array from disk. Returns [] on any error. */
function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const raw = fs.readFileSync(STORE_PATH, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist notifications array to disk (max 100, latest first). */
function saveStore(notifications) {
  try {
    const trimmed = notifications.slice(0, MAX_RECORDS);
    fs.writeFileSync(STORE_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
    return trimmed;
  } catch (err) {
    console.error("[NotifService] saveStore error:", err.message);
    return notifications;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return all stored notifications (latest first). */
function getNotifications() {
  return loadStore();
}

/**
 * Create a new notification, persist it, and broadcast to all WS clients.
 *
 * @param {{
 *   type: string,
 *   title: string,
 *   message: string,
 *   schemeId?: string,
 *   schemeName?: string,
 *   priority?: 'low'|'medium'|'high'
 * }} payload
 * @returns {object} The created notification record
 */
function createNotification(payload) {
  const {
    type     = TYPES.SCHEME_UPDATED,
    title    = "Notification",
    message  = "",
    schemeId = null,
    schemeName = null,
    priority = "medium",
  } = payload;

  const newNotif = {
    id:         crypto.randomUUID(),
    type,
    title,
    message,
    schemeId,
    schemeName,
    timestamp:  new Date().toISOString(),
    priority,
    read:       false,
  };

  const existing = loadStore();
  const updated  = [newNotif, ...existing];
  saveStore(updated);

  // Broadcast to every open WS client
  _broadcast({ event: "SCHEME_UPDATED", type: "NOTIFICATION", data: newNotif });

  console.log(`[NotifService] Created: [${type}] ${title}`);
  return newNotif;
}

/**
 * Mark one or all notifications as read.
 * @param {string} id  Pass 'all' to mark everything read.
 */
function markNotificationRead(id) {
  const list = loadStore().map(n =>
    (id === "all" || n.id === id) ? { ...n, read: true } : n
  );
  saveStore(list);
  return list;
}

/** Delete all stored notifications. */
function clearNotifications() {
  saveStore([]);
  return [];
}

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

/**
 * Attach the WebSocket server to the existing Express HTTP server.
 * Call this once from server.js, passing the `http.Server` instance.
 *
 * @param {import("http").Server} httpServer
 */
function initWebSocketServer(httpServer) {
  // Use a path so it doesn't conflict with any existing WS setup
  wss = new WebSocketServer({ server: httpServer, path: "/ws/notifications" });

  wss.on("connection", (ws, req) => {
    console.log("[WS] Notification client connected.");
    ws.isAlive = true;

    // Send full notification history on connect
    const history = loadStore();
    _send(ws, { event: "INIT_NOTIFICATIONS", type: "INIT", data: history });

    // Listen for client messages (e.g. MARK_READ)
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === "MARK_READ") {
          const updated = markNotificationRead(msg.id || "all");
          // Confirm back to this client only
          _send(ws, { event: "NOTIFICATIONS_UPDATED", type: "UPDATE", data: updated });
        }
      } catch { /* ignore malformed */ }
    });

    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("close", () => console.log("[WS] Notification client disconnected."));
    ws.on("error", (err) => console.error("[WS] Client error:", err.message));
  });

  // Heartbeat: ping every 30 s, terminate dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => clearInterval(heartbeat));

  console.log("[WS] Notification WebSocket server ready on /ws/notifications");
  return wss;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Broadcast a payload to all open WS clients. */
function _broadcast(payload) {
  if (!wss) return;
  const msg = JSON.stringify(payload);
  wss.clients.forEach((ws) => {
    if (ws.readyState === OPEN) ws.send(msg);
  });
}

/** Send to a single client safely. */
function _send(ws, payload) {
  if (ws.readyState === OPEN) ws.send(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  TYPES,
  initWebSocketServer,
  createNotification,
  getNotifications,
  markNotificationRead,
  clearNotifications,
};
