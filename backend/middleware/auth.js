const { verifyAuthToken } = require("../services/store");
const users = require("../repositories/users");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = users.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Sign in to continue." });
    req.user = user;
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
