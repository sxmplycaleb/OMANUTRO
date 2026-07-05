const crypto = require("crypto");
const users = require("../repositories/users");
const rbac = require("../repositories/rbac");
const {
  hashPassword,
  verifyPassword,
  hashSecret,
  publicUser,
  createAuthToken
} = require("../services/store");
const MessagingService = require("../services/messaging");
const { normalizePhone } = require("../services/whatsapp");
const rateLimits = require("../repositories/rate-limits");
const { badRequest, notFound, tooManyRequests, unauthorized } = require("../http/errors");
const { deleteUploadThingFile, uploadChanged } = require("../lib/uploadthing/files");

function isValidTimedSecret(record) {
  return Boolean(record?.expiresAt && new Date(record.expiresAt).getTime() > Date.now());
}

function withAccess(user) {
  const access = rbac.accessForUser(user);
  return { ...user, roles: access.roles, permissions: access.permissions };
}

function sessionFor(user) {
  return { user: publicUser(withAccess(user)), token: createAuthToken(user) };
}

function googleSession(user) {
  return sessionFor(user);
}

function logout(user) {
  if (user?.id && users.invalidateSessions) {
    users.invalidateSessions(user.id);
  }
  return { message: "Logged out successfully." };
}

function currentUser(user, firebaseUser) {
  if (firebaseUser?.picture && firebaseUser.picture !== user.avatarUrl && users.updateAvatar) {
    return publicUser(withAccess(users.updateAvatar(user.id, firebaseUser.picture, user.avatarKey)));
  }

  return publicUser(withAccess(user));
}

async function updateProfile(user, body) {
  const name = String(body.name || user.name || "").trim();
  const phone = body.phone || user.phone;
  const updated = users.updateProfile(user.id, {
    name,
    phone,
    phoneNormalized: normalizePhone(phone) || null,
    dob: body.dob || "",
    gender: body.gender || "",
    username: body.username || "",
    bio: body.bio || ""
  });

  if ((body.avatarUrl !== undefined || body.avatarKey !== undefined) && users.updateAvatar) {
    if (uploadChanged(user.avatarKey, body.avatarKey)) {
      await deleteUploadThingFile(user.avatarKey);
    }
    return publicUser(withAccess(users.updateAvatar(updated.id, body.avatarUrl, body.avatarKey)));
  }

  return publicUser(withAccess(updated));
}

function login(body) {
  const user = users.byIdentifier(body.email || body.identifier, normalizePhone);

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    throw unauthorized("Invalid email/phone or password.");
  }

  const access = rbac.accessForUser(user);
  if (access.permissions.includes("*") || access.permissions.includes("admin:access")) {
    rbac.log(user.id, "staff.login", "user", user.id);
  }

  return sessionFor(user);
}

function phoneOnlyEmail(phone) {
  return `${normalizePhone(phone)}@phone.omanutro.local`;
}

function enforceRateLimit({ action, key, limit = 5, windowMs = 10 * 60 * 1000 }) {
  const result = rateLimits.consume({ action, key, limit, windowMs, lockoutMs: windowMs });
  if (!result.allowed) {
    throw tooManyRequests(`Too many attempts. Please try again in ${result.retryAfterSeconds} seconds.`);
  }
}

async function requestSignupCode(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(body.phone);

  if (!phone) {
    throw badRequest("WhatsApp phone number is required.");
  }

  if (email && users.findByEmail(email)) {
    throw badRequest("Email already in use.");
  }
  if (users.byIdentifier(phone, normalizePhone)) {
    throw badRequest("Phone number already in use.");
  }

  enforceRateLimit({ action: "signup_otp_send", key: phone });

  await MessagingService.sendOTP({
    to: phone,
    channel: body.channel,
    type: "signup_otp"
  });

  return {
    verificationId: null,
    message: "Signup code sent."
  };
}

async function register(body) {
  const phone = normalizePhone(body.phone);
  const method = body.method === "phone" || (!body.email && phone) ? "phone" : "email";
  const email = method === "phone" ? phoneOnlyEmail(phone) : String(body.email || "").trim().toLowerCase();

  if (method === "email" && !email) {
    throw badRequest("Email is required.");
  }

  if (method === "phone") {
    if (!phone) throw badRequest("Phone number is required.");
    enforceRateLimit({ action: "signup_otp_verify", key: phone });
    const verification = await MessagingService.verifyOTP({
      to: phone,
      code: body.code,
      type: "signup_otp_check"
    });
    if (!verification.approved) {
      throw badRequest("Invalid signup verification code.");
    }
    rateLimits.reset({ action: "signup_otp_verify", key: phone });
  }

  if (phone && users.byIdentifier(phone, normalizePhone)) {
    throw badRequest("Phone number already in use.");
  }

  if (!email && !phone) {
    throw badRequest("Email or phone number is required.");
  }

  if (!body.password || String(body.password).length < 6) {
    throw badRequest("Password must be at least 6 characters.");
  }

  if (email && users.findByEmail(email)) {
    throw badRequest("Email already in use.");
  }

  const user = users.create({
    id: `user_${crypto.randomBytes(8).toString("hex")}`,
    name: body.name || "Customer",
    email,
    phone: phone || null,
    phoneNormalized: phone || null,
    phoneVerifiedAt: method === "phone" ? new Date().toISOString() : null,
    emailVerifiedAt: method === "email" ? new Date().toISOString() : null,
    passwordHash: hashPassword(body.password),
    role: "customer",
    createdAt: new Date().toISOString()
  });

  return sessionFor(user);
}

async function requestPasswordReset(body) {
  const user = users.byIdentifier(body.identifier || body.email, normalizePhone);

  if (!user) throw notFound("No account found for that email or phone.");
  if (!user.phone) throw badRequest("This account has no verified WhatsApp phone number.");

  enforceRateLimit({ action: "password_reset_otp_send", key: user.phone });

  await MessagingService.sendOTP({
    to: user.phone,
    channel: body.channel,
    type: "password_reset_otp"
  });

  return {
    message: "Reset code sent."
  };
}

async function verifyResetCode(body) {
  const user = users.byIdentifier(body.identifier || body.email, normalizePhone);

  if (!user?.phone) {
    throw badRequest("Invalid or expired reset code.");
  }

  enforceRateLimit({ action: "password_reset_otp_verify", key: user.phone });

  const verification = await MessagingService.verifyOTP({
    to: user.phone,
    code: body.code,
    type: "password_reset_otp_check"
  });

  if (!verification.approved) {
    throw badRequest("Invalid or expired reset code.");
  }
  rateLimits.reset({ action: "password_reset_otp_verify", key: user.phone });

  const resetToken = crypto.randomBytes(32).toString("hex");
  users.setPasswordReset(user.id, {
    resetTokenHash: hashSecret(resetToken),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    verifiedAt: new Date().toISOString()
  });

  return { resetToken };
}

function resetPassword(body) {
  const tokenHash = hashSecret(body.resetToken || "");
  const user = users.findByResetTokenHash(tokenHash, isValidTimedSecret);

  if (!user) throw badRequest("Invalid or expired reset token.");
  if (!body.password || String(body.password).length < 6) {
    throw badRequest("Password must be at least 6 characters.");
  }

  users.clearPasswordResetAndUpdatePassword(user.id, hashPassword(body.password));
  if (users.invalidateSessions) users.invalidateSessions(user.id);
  return { message: "Password updated." };
}

module.exports = {
  currentUser,
  googleSession,
  logout,
  updateProfile,
  login,
  requestSignupCode,
  register,
  requestPasswordReset,
  verifyResetCode,
  resetPassword
};
