const express = require("express");
const applications = require("../repositories/applications");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const application = applications.create(req.body || {});
    res.status(201).json({ application });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/", authenticate, (req, res) => {
  res.json({ applications: applications.allForUser(req.user) });
});

module.exports = router;
