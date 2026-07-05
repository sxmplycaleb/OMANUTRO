const crypto = require("crypto");
const { db } = require("./database");

function toMessageLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    recipient: row.recipient,
    channel: row.channel,
    type: row.type,
    provider: row.provider,
    providerSid: row.provider_sid,
    status: row.status,
    deliveryStatus: row.delivery_status,
    error: row.error,
    failureReason: row.failure_reason,
    messageSid: row.message_sid,
    retryCount: row.retry_count,
    deliveryCost: row.delivery_cost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    failedAt: row.failed_at
  };
}

function enabled() {
  return process.env.ENABLE_MESSAGE_LOGS !== "false";
}

function create(entry) {
  if (!enabled()) return null;
  const now = new Date().toISOString();
  const id = entry.id || `msg_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(`
    INSERT INTO message_logs (
      id, recipient, channel, type, provider, provider_sid, status, delivery_status,
      error, failure_reason, message_sid, retry_count, delivery_cost,
      created_at, updated_at, sent_at, delivered_at, failed_at
    ) VALUES (
      @id, @recipient, @channel, @type, @provider, @providerSid, @status, @deliveryStatus,
      @error, @failureReason, @messageSid, @retryCount, @deliveryCost,
      @createdAt, @updatedAt, @sentAt, @deliveredAt, @failedAt
    )
  `).run({
    id,
    recipient: entry.recipient || "",
    channel: entry.channel || "",
    type: entry.type || "notification",
    provider: entry.provider || "twilio",
    providerSid: entry.providerSid || null,
    status: entry.status || "queued",
    deliveryStatus: entry.deliveryStatus || entry.status || "queued",
    error: entry.error || null,
    failureReason: entry.failureReason || null,
    messageSid: entry.messageSid || null,
    retryCount: Number(entry.retryCount || 0),
    deliveryCost: entry.deliveryCost ?? null,
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
    sentAt: entry.sentAt || null,
    deliveredAt: entry.deliveredAt || null,
    failedAt: entry.failedAt || null
  });
  return findById(id);
}

function findById(id) {
  return toMessageLog(db.prepare("SELECT * FROM message_logs WHERE id = ?").get(id));
}

function findByMessageSid(messageSid) {
  return toMessageLog(db.prepare("SELECT * FROM message_logs WHERE message_sid = ?").get(messageSid));
}

function update(id, patch) {
  if (!enabled() || !id) return null;
  const current = findById(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE message_logs
    SET recipient = @recipient,
        channel = @channel,
        type = @type,
        provider = @provider,
        provider_sid = @providerSid,
        status = @status,
        delivery_status = @deliveryStatus,
        error = @error,
        failure_reason = @failureReason,
        message_sid = @messageSid,
        retry_count = @retryCount,
        delivery_cost = @deliveryCost,
        updated_at = @updatedAt,
        sent_at = @sentAt,
        delivered_at = @deliveredAt,
        failed_at = @failedAt
    WHERE id = @id
  `).run(next);
  return findById(id);
}

function incrementRetry(id) {
  if (!enabled() || !id) return null;
  db.prepare(`
    UPDATE message_logs
    SET retry_count = retry_count + 1,
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);
  return findById(id);
}

function updateByMessageSid(messageSid, patch) {
  const current = findByMessageSid(messageSid);
  return current ? update(current.id, patch) : null;
}

function all({ limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  return db.prepare("SELECT * FROM message_logs ORDER BY created_at DESC LIMIT ?").all(safeLimit).map(toMessageLog);
}

module.exports = {
  create,
  findById,
  findByMessageSid,
  update,
  incrementRetry,
  updateByMessageSid,
  all
};
