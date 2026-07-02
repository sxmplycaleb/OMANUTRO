const express = require("express");
const cartService = require("../application/cart-service");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
  res.json({ cart: cartService.listCart(req.user) });
});

router.post("/", (req, res) => {
  res.json({ cart: cartService.replaceCart(req.user, req.body.items || []) });
});

router.post("/merge", (req, res) => {
  res.json({ cart: cartService.mergeCart(req.user, req.body.items || []) });
});

router.put("/items/:itemId", (req, res) => {
  res.json({ cart: cartService.updateCartItem(req.user, req.params.itemId, req.body.quantity) });
});

router.delete("/items/:itemId", (req, res) => {
  res.json({ cart: cartService.removeCartItem(req.user, req.params.itemId) });
});

module.exports = router;
