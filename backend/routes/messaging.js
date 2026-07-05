const express = require("express");
const MessagingService = require("../services/messaging");
const users = require("../repositories/users");
const { authenticate, requirePermission } = require("../middleware/auth");
const asyncHandler = require("../http/async-handler");
const { badRequest } = require("../http/errors");
const { validateStatusCallback } = require("../services/messaging/twilio");

const router = express.Router();

router.post("/twilio/status", (req, res) => {
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK || `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const valid = validateStatusCallback({
    signature: req.get("x-twilio-signature"),
    params: req.body || {},
    url: callbackUrl
  });
  if (!valid) return res.status(403).json({ error: "Invalid Twilio signature." });
  MessagingService.updateDeliveryStatus(req.body || {});
  res.status(204).send();
});

router.use(authenticate, requirePermission("integrations:manage"));

router.get("/logs", (req, res) => {
  res.json({ messages: MessagingService.messageLogs.all({ limit: req.query.limit }) });
});

router.get("/health", asyncHandler(async (req, res) => {
  res.json(await MessagingService.health());
}));

router.post("/sms", asyncHandler(async (req, res) => {
  const to = String(req.body.to || "").trim();
  const message = String(req.body.message || "").trim();
  if (!to || !message) throw badRequest("Recipient and message are required.");
  res.json(await MessagingService.sendSMS(to, message, { type: req.body.type || "admin_sms" }));
}));

router.post("/whatsapp", asyncHandler(async (req, res) => {
  const to = String(req.body.to || "").trim();
  const message = String(req.body.message || "").trim();
  if (!to || !message) throw badRequest("Recipient and message are required.");
  res.json(await MessagingService.sendWhatsApp(to, message, { type: req.body.type || "admin_whatsapp" }));
}));

router.post("/broadcast", asyncHandler(async (req, res) => {
  const message = String(req.body.message || "").trim();
  const channel = req.body.channel;
  const explicitRecipients = Array.isArray(req.body.recipients) ? req.body.recipients : [];
  const recipients = explicitRecipients.length
    ? explicitRecipients
    : users.all().map((user) => user.phone).filter(Boolean);

  if (!message) throw badRequest("Message is required.");
  if (!recipients.length) throw badRequest("No recipients found.");

  const queued = recipients.map((to) => MessagingService.enqueueMessage({
    to,
    message,
    channel,
    type: req.body.type || "admin_broadcast"
  }));

  res.json({ queued: queued.length });
}));

module.exports = router;
