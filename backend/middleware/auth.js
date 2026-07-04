const crypto = require("crypto");
const admin = require("../services/firebase-admin");
const users = require("../repositories/users");
const rbac = require("../repositories/rbac");
const { hashPassword, verifyAuthToken } = require("../services/store");

function authTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function authTokenFromHeaders(headers) {
  const authHeader = headers?.get?.("authorization") || headers?.authorization || "";
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

function userForLegacyToken(token) {
  const payload = verifyAuthToken(token);
  const user = users.findById(payload.sub);
  return user ? { user, firebase: null } : null;
}

function attachAccess(user) {
  const access = rbac.accessForUser(user);
  return {
    ...user,
    roles: access.roles,
    permissions: access.permissions
  };
}

async function authenticate(req, res, next) {
  const token = authTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    let session = null;
    try {
      session = userForLegacyToken(token);
    } catch {
      session = await userForFirebaseToken(token);
    }
    if (!session?.user) return res.status(401).json({ error: "Sign in to continue." });
    req.user = attachAccess(session.user);
    req.firebaseUser = session.firebase;
    return next();
  } catch (error) {
    console.warn("Authentication failed.", {
      path: req.originalUrl,
      requestId: req.requestId,
      message: error.message
    });
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

async function userFromToken(token) {
  if (!token) return null;
  let session = null;
  try {
    session = userForLegacyToken(token);
  } catch {
    session = await userForFirebaseToken(token);
  }
  return session?.user ? attachAccess(session.user) : null;
}

async function authenticateHeaders(headers) {
  return userFromToken(authTokenFromHeaders(headers));
}

function requireAuth(req, res, next) {
  return authenticate(req, res, next);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
    if (!req.user.permissions?.includes("*") && !req.user.permissions?.includes(permission)) {
      rbac.log(req.user.id, "access.denied", "permission", permission, { path: req.originalUrl });
      return res.status(403).json({ error: "Admin access required. You do not have permission to access this resource." });
    }
    return next();
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
    if (!req.user.roles?.includes(role)) {
      rbac.log(req.user.id, "access.denied", "role", role, { path: req.originalUrl });
      return res.status(403).json({ error: "Required role missing." });
    }
    return next();
  };
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
    if (!roles.some((role) => req.user.roles?.includes(role))) {
      rbac.log(req.user.id, "access.denied", "role", roles.join(","), { path: req.originalUrl });
      return res.status(403).json({ error: "Required role missing." });
    }
    return next();
  };
}

function requireAdmin(req, res, next) {
  return requirePermission("admin:access")(req, res, next);
}

module.exports = {
  authenticate,
  requireAuth,
  requireRole,
  requireAnyRole,
  requirePermission,
  requireAdmin,
  authenticateHeaders,
  userFromToken
};
