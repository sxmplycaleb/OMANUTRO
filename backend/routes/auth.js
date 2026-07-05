const express = require("express");
const authService = require("../application/auth-service");
const { authenticate, userForFirebaseToken } = require("../middleware/auth");
const asyncHandler = require("../http/async-handler");
const { badRequest, unauthorized } = require("../http/errors");

const router = express.Router();

router.get("/me", authenticate, (req, res) => {
  res.json({ user: authService.currentUser(req.user, req.firebaseUser) });
});

router.put("/profile", authenticate, asyncHandler(async (req, res) => {
  res.json({ user: await authService.updateProfile(req.user, req.body) });
}));

router.post("/login", (req, res) => {
  res.json(authService.login(req.body));
});

router.post("/google", asyncHandler(async (req, res) => {
  const idToken = String(req.body?.idToken || "");
  if (!idToken) throw badRequest("Google token is required.");
  const session = await userForFirebaseToken(idToken);
  if (!session?.user) throw unauthorized("Google authentication failed.");
  res.json(authService.googleSession(session.user));
}));

router.post("/request-signup-code", asyncHandler(async (req, res) => {
  res.json(await authService.requestSignupCode(req.body));
}));

router.post("/register", asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body));
}));

router.post("/logout", authenticate, (req, res) => {
  res.json(authService.logout(req.user));
});

router.post("/forgot-password", asyncHandler(async (req, res) => {
  res.json(await authService.requestPasswordReset(req.body));
}));

router.post("/verify-reset-code", asyncHandler(async (req, res) => {
  res.json(await authService.verifyResetCode(req.body));
}));

router.post("/reset-password", (req, res) => {
  res.json(authService.resetPassword(req.body));
});

module.exports = router;
