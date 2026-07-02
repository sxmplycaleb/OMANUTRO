const crypto = require("crypto");
const admin = require("../services/firebase-admin");
const users = require("../repositories/users");
const { hashPassword } = require("../services/store");

function authTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function createFirebaseUser({ uid, email, name }) {
  return users.create({
    id: `firebase_${uid}`,
    name: name || email.split("@")[0] || "Customer",
    email,
    passwordHash: hashPassword(crypto.randomBytes(32).toString("hex")),
    role: "customer",
    emailVerifiedAt: new Date().toISOString(),
    firebaseUid: uid,
    createdAt: new Date().toISOString()
  });
}

async function userForFirebaseToken(idToken) {
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid, email, name, picture } = decodedToken;

  if (!uid || !email) {
    return null;
  }

  let user = users.findByFirebaseUid ? users.findByFirebaseUid(uid) : users.findById(`firebase_${uid}`);

  if (user) {
    return { user, firebase: { uid, email, name, picture } };
  }

  user = users.findByEmail(email);

  if (user) {
    if (users.linkFirebaseUid) {
      user = users.linkFirebaseUid(user.id, uid);
    }
    return { user, firebase: { uid, email, name, picture } };
  }

  user = createFirebaseUser({ uid, email, name });
  return { user, firebase: { uid, email, name, picture } };
}

async function authenticate(req, res, next) {
  const token = authTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const session = await userForFirebaseToken(token);
    if (!session?.user) return res.status(401).json({ error: "Sign in to continue." });
    req.user = session.user;
    req.firebaseUser = session.firebase;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  return next();
}

module.exports = {
  authenticate,
  requireAdmin
};
