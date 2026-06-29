const { db, json, parseJson } = require("./database");

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    passwordHash: row.password_hash,
    dob: row.dob,
    gender: row.gender,
    username: row.username,
    bio: row.bio,
    phoneVerifiedAt: row.phone_verified_at,
    emailVerifiedAt: row.email_verified_at,
    passwordReset: parseJson(row.password_reset_json, null),
    createdAt: row.created_at
  };
}

function byIdentifier(identifier, normalizePhone) {
  const value = String(identifier || "").trim().toLowerCase();
  const phone = normalizePhone(identifier);
  const rows = db.prepare("SELECT * FROM users").all();
  return rows.map(toUser).find((user) => (
    String(user.email || "").toLowerCase() === value ||
    normalizePhone(user.phone) === phone
  )) || null;
}

function findById(id) {
  return toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

function findByEmail(email) {
  return toUser(db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email));
}

function create(user) {
  db.prepare(`
    INSERT INTO users (
      id, email, name, phone, role, password_hash, dob, gender, username, bio,
      phone_verified_at, email_verified_at, password_reset_json, created_at
    ) VALUES (
      @id, @email, @name, @phone, @role, @passwordHash, @dob, @gender, @username, @bio,
      @phoneVerifiedAt, @emailVerifiedAt, @passwordResetJson, @createdAt
    )
  `).run({
    ...user,
    phone: user.phone || null,
    dob: user.dob || null,
    gender: user.gender || null,
    username: user.username || null,
    bio: user.bio || null,
    phoneVerifiedAt: user.phoneVerifiedAt || null,
    emailVerifiedAt: user.emailVerifiedAt || null,
    passwordResetJson: json(user.passwordReset),
    createdAt: user.createdAt || new Date().toISOString()
  });
  return findById(user.id);
}

function updateProfile(userId, profile) {
  db.prepare(`
    UPDATE users
    SET name = @name,
        phone = @phone,
        dob = @dob,
        gender = @gender,
        username = @username,
        bio = @bio
    WHERE id = @id
  `).run({ id: userId, ...profile });
  return findById(userId);
}

function setPasswordReset(userId, passwordReset) {
  db.prepare("UPDATE users SET password_reset_json = ? WHERE id = ?").run(json(passwordReset), userId);
  return findById(userId);
}

function clearPasswordResetAndUpdatePassword(userId, passwordHash) {
  db.prepare("UPDATE users SET password_hash = ?, password_reset_json = NULL WHERE id = ?").run(passwordHash, userId);
  return findById(userId);
}

function findByResetTokenHash(tokenHash, isValidTimedSecret) {
  return db.prepare("SELECT * FROM users WHERE password_reset_json IS NOT NULL").all()
    .map(toUser)
    .find((user) => isValidTimedSecret(user.passwordReset) && user.passwordReset.resetTokenHash === tokenHash) || null;
}

module.exports = {
  byIdentifier,
  findById,
  findByEmail,
  create,
  updateProfile,
  setPasswordReset,
  clearPasswordResetAndUpdatePassword,
  findByResetTokenHash
};
