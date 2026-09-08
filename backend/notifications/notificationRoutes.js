/**
 * GovMatch AI — Notification REST Routes
 * Mount under /api in server.js: app.use("/api", notificationRoutes)
 */

"use strict";

const express = require("express");
const router  = express.Router();
const {
  TYPES,
  getNotifications,
  createNotification,
  markNotificationRead,
  clearNotifications,
} = require("./notificationService");

// ---------------------------------------------------------------------------
// GET /api/notifications — fetch all notifications
// ---------------------------------------------------------------------------
router.get("/notifications", (req, res) => {
  try {
    const notifications = getNotifications();
    res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/mark-read — mark one or all as read
// Body: { id: "uuid" }  OR  { id: "all" }
// ---------------------------------------------------------------------------
router.post("/notifications/mark-read", (req, res) => {
  try {
    const { id = "all" } = req.body;
    const updated = markNotificationRead(id);
    res.json({ success: true, notifications: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/clear — delete all notifications
// ---------------------------------------------------------------------------
router.post("/notifications/clear", (req, res) => {
  try {
    clearNotifications();
    res.json({ success: true, message: "All notifications cleared." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/test — create a sample notification (dev/testing)
// Body (optional): { type, title, message, schemeName, priority }
// ---------------------------------------------------------------------------
router.post("/notifications/test", (req, res) => {
  try {
    const {
      type      = TYPES.NEW_SCHEME,
      title     = "Test Notification",
      message   = "This is a test notification from GovMatch AI.",
      schemeName = "PM-KISAN",
      priority  = "medium",
    } = req.body;

    const notif = createNotification({ type, title, message, schemeName, priority });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
