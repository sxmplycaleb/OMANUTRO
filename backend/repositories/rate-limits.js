const { db } = require("./database");

function nowMs() {
  return Date.now();
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function fromIso(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function consume({ action, key, limit, windowMs, lockoutMs = windowMs }) {
  const id = `${action}:${key}`;
  const now = nowMs();
  const row = db.prepare("SELECT * FROM rate_limits WHERE id = ?").get(id);

  if (row && fromIso(row.locked_until) > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((fromIso(row.locked_until) - now) / 1000),
      locked: true
    };
  }

  const windowStart = row && fromIso(row.window_start) + windowMs > now
    ? fromIso(row.window_start)
    : now;
  const count = row && fromIso(row.window_start) + windowMs > now
    ? Number(row.count || 0) + 1
    : 1;
  const lockedUntil = count > limit ? now + lockoutMs : null;

  db.prepare(`
    INSERT INTO rate_limits (id, action, key, count, window_start, locked_until, updated_at)
    VALUES (@id, @action, @key, @count, @windowStart, @lockedUntil, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      count = excluded.count,
      window_start = excluded.window_start,
      locked_until = excluded.locked_until,
      updated_at = excluded.updated_at
  `).run({
    id,
    action,
    key,
    count,
    windowStart: toIso(windowStart),
    lockedUntil: lockedUntil ? toIso(lockedUntil) : null,
    updatedAt: toIso(now)
  });

  if (lockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000),
      locked: true
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.ceil((windowStart + windowMs - now) / 1000)
  };
}

function reset({ action, key }) {
  db.prepare("DELETE FROM rate_limits WHERE id = ?").run(`${action}:${key}`);
}

function pruneExpired() {
  db.prepare("DELETE FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until < ?").run(new Date().toISOString());
}

module.exports = {
  consume,
  reset,
  pruneExpired
};
