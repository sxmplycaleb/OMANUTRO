const express = require("express");
const authService = require("../application/auth-service");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../http/async-handler");

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

router.post("/request-signup-code", asyncHandler(async (req, res) => {
  res.json(await authService.requestSignupCode(req.body));
}));

router.post("/register", asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body));
}));

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully." });
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
