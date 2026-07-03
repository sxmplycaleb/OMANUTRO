const express = require("express");
const accountService = require("../application/account-service");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../http/async-handler");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
  res.json(accountService.dashboard(req.user));
});

router.put("/", asyncHandler(async (req, res) => {
  res.json({ user: await accountService.updateProfile(req.user, req.body) });
}));

module.exports = router;
