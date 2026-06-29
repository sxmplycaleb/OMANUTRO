const { db } = require("./database");

function toVerification(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    email: row.email,
    phone: row.phone,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

function pruneExpired(type) {
  db.prepare("DELETE FROM verification_records WHERE type = ? AND expires_at <= ?")
    .run(type, new Date().toISOString());
}

function create(record) {
  db.prepare(`
    INSERT INTO verification_records (
      id, type, email, phone, code_hash, expires_at, created_at
    ) VALUES (
      @id, @type, @email, @phone, @codeHash, @expiresAt, @createdAt
    )
  `).run(record);
  return findById(record.id);
}

function replaceRecentSignup(record) {
  db.transaction(() => {
    pruneExpired("signup");
    const idsToKeep = db.prepare(`
      SELECT id FROM verification_records
      WHERE type = 'signup'
      ORDER BY created_at DESC
      LIMIT 20
    `).all().map((row) => row.id);
    if (idsToKeep.length) {
      db.prepare(`
        DELETE FROM verification_records
        WHERE type = 'signup' AND id NOT IN (${idsToKeep.map(() => "?").join(",")})
      `).run(...idsToKeep);
    }
    create(record);
  })();
  return findById(record.id);
}

function findById(id) {
  return toVerification(db.prepare("SELECT * FROM verification_records WHERE id = ?").get(id));
}

function remove(id) {
  db.prepare("DELETE FROM verification_records WHERE id = ?").run(id);
}

module.exports = {
  create,
  replaceRecentSignup,
  findById,
  remove,
  pruneExpired
};
