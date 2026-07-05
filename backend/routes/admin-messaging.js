const express = require("express");
const MessagingService = require("../services/messaging");
const { authenticate, requirePermission } = require("../middleware/auth");
const asyncHandler = require("../http/async-handler");

const router = express.Router();

router.use(authenticate, requirePermission("integrations:manage"));

router.get("/health", asyncHandler(async (req, res) => {
  res.json(await MessagingService.health());
}));

module.exports = router;
