const express = require("express");
const productsService = require("../application/products-service");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(productsService.listProducts(req.query));
});

router.get("/suggestions", (req, res) => {
  res.json({ suggestions: productsService.suggestions(req.query) });
});

router.post("/", authenticate, requireAdmin, (req, res) => {
  res.status(201).json({ product: productsService.createProduct(req.body) });
});

router.put("/:productId", authenticate, requireAdmin, (req, res) => {
  res.json({ product: productsService.updateProduct(req.params.productId, req.body) });
});

router.delete("/:productId", authenticate, requireAdmin, (req, res) => {
  res.json(productsService.deleteProduct(req.params.productId));
});

module.exports = router;
