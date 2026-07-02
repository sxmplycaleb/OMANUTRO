const express = require("express");
const addresses = require("../repositories/addresses");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
  res.json({ addresses: addresses.allForUser(req.user.id) });
});

router.post("/", (req, res) => {
  try {
    res.status(201).json({ address: addresses.create(req.user.id, req.body) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:addressId", (req, res) => {
  try {
    const address = addresses.update(req.user.id, req.params.addressId, req.body);
    if (!address) return res.status(404).json({ error: "Address not found." });
    res.json({ address });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:addressId", (req, res) => {
  if (!addresses.remove(req.user.id, req.params.addressId)) {
    return res.status(404).json({ error: "Address not found." });
  }
  return res.json({ message: "Address deleted." });
});

module.exports = router;
