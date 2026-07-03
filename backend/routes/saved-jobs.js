const express = require("express");
const savedJobs = require("../repositories/saved-jobs");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
  res.json({ savedJobs: savedJobs.allForUser(req.user.id) });
});

router.post("/", (req, res) => {
  try {
    res.status(201).json({ savedJobs: savedJobs.add(req.user.id, req.body) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", (req, res) => {
  res.json({ savedJobs: savedJobs.remove(req.user.id, req.params.id) });
});

module.exports = router;
