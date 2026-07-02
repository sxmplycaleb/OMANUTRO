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
    firebaseUid: row.firebase_uid,
    avatarUrl: row.avatar_url,
    passwordReset: parseJson(row.password_reset_json, null),
    createdAt: row.created_at
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function displayNameFromFirebase(decodedToken) {
  const email = normalizeEmail(decodedToken.email);
  return String(decodedToken.name || decodedToken.displayName || email.split("@")[0] || "Customer").trim();
}

function byIdentifier(identifier, normalizePhone) {
  const value = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  return toUser(db.prepare(`
    SELECT * FROM users
    WHERE lower(email) = ?
       OR (phone_normalized IS NOT NULL AND phone_normalized = ?)
    LIMIT 1
  `).get(value, phone || null));
}

function findById(id) {
  return toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

function findByEmail(email) {
  const rows = db.prepare("SELECT * FROM users WHERE lower(email) = ?").all(normalizeEmail(email));
  if (rows.length > 1) {
    throw new Error("Duplicate user accounts found for this email. Resolve the conflict before linking Firebase.");
  }
  return toUser(rows[0]);
}

function findByFirebaseUid(uid) {
  return toUser(db.prepare("SELECT * FROM users WHERE firebase_uid = ?").get(uid));
}

function all() {
  return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all().map(toUser);
}

function create(user) {
  db.prepare(`
    INSERT INTO users (
      id, email, name, phone, phone_normalized, role, password_hash, dob, gender, username, bio,
      phone_verified_at, email_verified_at, password_reset_json, reset_token_hash, reset_expires_at,
      firebase_uid, avatar_url, created_at
    ) VALUES (
      @id, @email, @name, @phone, @phoneNormalized, @role, @passwordHash, @dob, @gender, @username, @bio,
      @phoneVerifiedAt, @emailVerifiedAt, @passwordResetJson, @resetTokenHash, @resetExpiresAt,
      @firebaseUid, @avatarUrl, @createdAt
    )
  `).run({
    ...user,
    email: normalizeEmail(user.email),
    phone: user.phone || null,
    phoneNormalized: user.phoneNormalized || user.phone || null,
    dob: user.dob || null,
    gender: user.gender || null,
    username: user.username || null,
    bio: user.bio || null,
    phoneVerifiedAt: user.phoneVerifiedAt || null,
    emailVerifiedAt: user.emailVerifiedAt || null,
    passwordResetJson: json(user.passwordReset),
    resetTokenHash: user.passwordReset?.resetTokenHash || null,
    resetExpiresAt: user.passwordReset?.expiresAt || null,
    firebaseUid: user.firebaseUid || null,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt || new Date().toISOString()
  });
  return findById(user.id);
}

function createFromFirebase(decodedToken) {
  const uid = String(decodedToken.uid || "").trim();
  const email = normalizeEmail(decodedToken.email);

  if (!uid) {
    throw new Error("Firebase UID is required.");
  }

  if (!email) {
    throw new Error("Firebase email is required.");
  }

  const existingByUid = findByFirebaseUid(uid);
  if (existingByUid) return existingByUid;

  const existingByEmail = findByEmail(email);
  if (existingByEmail) {
    const linked = linkFirebaseUid(existingByEmail.id, uid);
    return decodedToken.picture ? updateAvatar(linked.id, decodedToken.picture) : linked;
  }

  return create({
    id: `firebase_${uid}`,
    email,
    name: displayNameFromFirebase(decodedToken),
    role: "customer",
    passwordHash: "",
    firebaseUid: uid,
    avatarUrl: decodedToken.picture || null,
    emailVerifiedAt: decodedToken.email_verified ? new Date().toISOString() : null,
    createdAt: new Date().toISOString()
  });
}

function linkFirebaseUid(userId, uid) {
  const existing = findByFirebaseUid(uid);
  if (existing && existing.id !== userId) {
    throw new Error("Firebase UID is already linked to another account.");
  }

  db.prepare(`
    UPDATE users
    SET firebase_uid = ?
    WHERE id = ?
      AND (firebase_uid IS NULL OR firebase_uid = ?)
  `).run(uid, userId, uid);

  const user = findById(userId);
  if (!user || user.firebaseUid !== uid) {
    throw new Error("Unable to link Firebase account without overwriting an existing link.");
  }

  return user;
}

function updateAvatar(userId, avatarUrl) {
  db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl || null, userId);
  return findById(userId);
}

function updateProfile(userId, profile) {
  db.prepare(`
    UPDATE users
    SET name = @name,
        phone = @phone,
        phone_normalized = @phoneNormalized,
        dob = @dob,
        gender = @gender,
        username = @username,
        bio = @bio
    WHERE id = @id
  `).run({ id: userId, ...profile });
  return findById(userId);
}

function setPasswordReset(userId, passwordReset) {
  db.prepare(`
    UPDATE users
    SET password_reset_json = ?,
        reset_token_hash = ?,
        reset_expires_at = ?
    WHERE id = ?
  `).run(json(passwordReset), passwordReset?.resetTokenHash || null, passwordReset?.expiresAt || null, userId);
  return findById(userId);
}

function clearPasswordResetAndUpdatePassword(userId, passwordHash) {
  db.prepare(`
    UPDATE users
    SET password_hash = ?,
        password_reset_json = NULL,
        reset_token_hash = NULL,
        reset_expires_at = NULL
    WHERE id = ?
  `).run(passwordHash, userId);
  return findById(userId);
}

function findByResetTokenHash(tokenHash, isValidTimedSecret) {
  const user = toUser(db.prepare(`
    SELECT * FROM users
    WHERE reset_token_hash = ?
      AND reset_expires_at > ?
    LIMIT 1
  `).get(tokenHash, new Date().toISOString()));

  return isValidTimedSecret(user?.passwordReset) ? user : null;
}

module.exports = {
  all,
  byIdentifier,
  findById,
  findByEmail,
  findByFirebaseUid,
  create,
  createFromFirebase,
  linkFirebaseUid,
  updateAvatar,
  updateProfile,
  setPasswordReset,
  clearPasswordResetAndUpdatePassword,
  findByResetTokenHash
};
