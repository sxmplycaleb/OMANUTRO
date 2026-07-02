const express = require("express");
const productsService = require("../application/products-service");
const { authenticate, requirePermission } = require("../middleware/auth");
const rbac = require("../repositories/rbac");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(productsService.listProducts(req.query));
});

router.get("/suggestions", (req, res) => {
  res.json({ suggestions: productsService.suggestions(req.query) });
});

router.post("/", authenticate, requirePermission("products:manage"), (req, res) => {
  const product = productsService.createProduct(req.body);
  rbac.log(req.user.id, "product.created", "product", product.id);
  res.status(201).json({ product });
});

router.put("/:productId", authenticate, requirePermission("products:manage"), (req, res) => {
  const product = productsService.updateProduct(req.params.productId, req.body);
  rbac.log(req.user.id, "product.updated", "product", product.id);
  res.json({ product });
});

router.delete("/:productId", authenticate, requirePermission("products:manage"), (req, res) => {
  const result = productsService.deleteProduct(req.params.productId);
  rbac.log(req.user.id, "product.deleted", "product", req.params.productId);
  res.json(result);
});

module.exports = router;
