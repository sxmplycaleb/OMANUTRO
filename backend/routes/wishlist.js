const express = require("express");
const wishlist = require("../repositories/wishlist");
const carts = require("../repositories/carts");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
  res.json({ wishlist: wishlist.allForUser(req.user.id) });
});

router.post("/", (req, res) => {
  try {
    res.status(201).json({ wishlist: wishlist.add(req.user.id, req.body.productId) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:productId/move-to-cart", (req, res) => {
  try {
    const cart = carts.mergeForUser(req.user.id, [{ productId: req.params.productId, quantity: 1 }]);
    const nextWishlist = wishlist.remove(req.user.id, req.params.productId);
    res.json({ cart, wishlist: nextWishlist });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", (req, res) => {
  res.json({ wishlist: wishlist.remove(req.user.id, req.params.id) });
});

module.exports = router;
