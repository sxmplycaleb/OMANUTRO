const crypto = require("crypto");
const express = require("express");
const {
  hashPassword,
  verifyPassword,
  hashSecret,
  publicUser,
  createAuthToken
} = require("../services/store");
const users = require("../repositories/users");
const verifications = require("../repositories/verifications");
const { authenticate } = require("../middleware/auth");
const { normalizePhone, sendSignupCode, sendResetCode } = require("../services/whatsapp");

const router = express.Router();

function isValidTimedSecret(record) {
  return Boolean(record?.expiresAt && new Date(record.expiresAt).getTime() > Date.now());
}

router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put("/profile", authenticate, (req, res) => {
  const name = String(req.body.name || req.user.name || "").trim();
  const user = users.updateProfile(req.user.id, {
    name,
    phone: req.body.phone || req.user.phone,
    dob: req.body.dob || "",
    gender: req.body.gender || "",
    username: req.body.username || "",
    bio: req.body.bio || ""
  });

  res.json({ user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const user = users.byIdentifier(req.body.email || req.body.identifier, normalizePhone);

  if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email/phone or password." });
  }

  return res.json({ user: publicUser(user), token: createAuthToken(user) });
});

router.post("/request-signup-code", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = normalizePhone(req.body.phone);

    if (!email || !phone) {
      return res.status(400).json({ error: "Email and WhatsApp phone number are required." });
    }

    if (users.findByEmail(email)) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const verification = verifications.replaceRecentSignup({
      id: `signup_${crypto.randomBytes(8).toString("hex")}`,
      type: "signup",
      email,
      phone,
      codeHash: hashSecret(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    await sendSignupCode(phone, code);

    return res.json({
      verificationId: verification.id,
      message: "Signup code sent to WhatsApp.",
      ...(process.env.NODE_ENV === "production" ? {} : { signupCode: code })
    });
  } catch (error) {
    next(error);
  }
});

router.post("/register", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = normalizePhone(req.body.phone);
  const verification = verifications.findById(req.body.verificationId);

  if (!verification || verification.type !== "signup" || !isValidTimedSecret(verification)) {
    return res.status(400).json({ error: "Request a fresh WhatsApp signup code first." });
  }

  if (verification.email !== email || verification.phone !== phone || verification.codeHash !== hashSecret(req.body.code)) {
    return res.status(400).json({ error: "Invalid signup verification code." });
  }

  if (!req.body.password || String(req.body.password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  if (users.findByEmail(email)) {
    return res.status(400).json({ error: "Email already in use." });
  }

  const user = users.create({
    id: `user_${crypto.randomBytes(8).toString("hex")}`,
    name: req.body.name || "Customer",
    email,
    phone,
    phoneVerifiedAt: new Date().toISOString(),
    passwordHash: hashPassword(req.body.password),
    role: "customer",
    createdAt: new Date().toISOString()
  });

  verifications.remove(verification.id);
  return res.status(201).json({ user: publicUser(user), token: createAuthToken(user) });
});

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully." });
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const user = users.byIdentifier(req.body.identifier || req.body.email, normalizePhone);

    if (!user) return res.status(404).json({ error: "No account found for that email or phone." });
    if (!user.phone) return res.status(400).json({ error: "This account has no verified WhatsApp phone number." });

    const code = String(crypto.randomInt(100000, 999999));
    users.setPasswordReset(user.id, {
      codeHash: hashSecret(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    await sendResetCode(user, code);

    return res.json({
      message: "Reset code sent to WhatsApp.",
      ...(process.env.NODE_ENV === "production" ? {} : { resetCode: code })
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-reset-code", (req, res) => {
  const user = users.byIdentifier(req.body.identifier || req.body.email, normalizePhone);

  if (!user || !isValidTimedSecret(user.passwordReset) || hashSecret(req.body.code) !== user.passwordReset.codeHash) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  users.setPasswordReset(user.id, {
    ...user.passwordReset,
    resetTokenHash: hashSecret(resetToken),
    verifiedAt: new Date().toISOString()
  });

  return res.json({ resetToken });
});

router.post("/reset-password", (req, res) => {
  const tokenHash = hashSecret(req.body.resetToken || "");
  const user = users.findByResetTokenHash(tokenHash, isValidTimedSecret);

  if (!user) return res.status(400).json({ error: "Invalid or expired reset token." });
  if (!req.body.password || String(req.body.password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  users.clearPasswordResetAndUpdatePassword(user.id, hashPassword(req.body.password));
  return res.json({ message: "Password updated." });
});

module.exports = router;
