const crypto = require("crypto");
const express = require("express");
const productsRepository = require("../repositories/products");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function productTags(product) {
  if (Array.isArray(product.tags)) return product.tags;
  return String(product.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function productText(product) {
  return `${product.name} ${product.category} ${product.description} ${productTags(product).join(" ")}`.toLowerCase();
}

function filterProducts(products, query) {
  const search = String(query.search || "").toLowerCase();
  const category = query.category || "all";
  const maxPrice = Number(query.maxPrice || Infinity);
  const minRating = Number(query.minRating || 0);
  const inStock = query.inStock === "true";

  return products.filter((product) => (
    (!search || productText(product).includes(search)) &&
    (category === "all" || !category || product.category === category) &&
    product.price <= maxPrice &&
    product.rating >= minRating &&
    (!inStock || product.stock > 0)
  ));
}

function parseTags(tags) {
  return Array.isArray(tags)
    ? tags
    : String(tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

router.get("/", (req, res) => {
  const products = productsRepository.all();
  const filteredProducts = filterProducts(products, req.query);
  const categories = [...new Set(products.map((product) => product.category))].sort();
  res.json({ products: filteredProducts, categories });
});

router.get("/suggestions", (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();
  const suggestions = productsRepository.all()
    .filter((product) => search && productText(product).includes(search))
    .flatMap((product) => [product.name, product.category, ...productTags(product)])
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((entry) => entry.toLowerCase() === value.toLowerCase()) === index)
    .slice(0, 8);

  res.json({ suggestions });
});

router.post("/", authenticate, requireAdmin, (req, res) => {
  const now = new Date().toISOString();
  const product = productsRepository.create({
    id: `prod_${crypto.randomBytes(8).toString("hex")}`,
    name: req.body.name,
    category: req.body.category,
    description: req.body.description,
    price: Number(req.body.price || 0),
    stock: Number(req.body.stock || 0),
    rating: Number(req.body.rating || 0),
    tags: parseTags(req.body.tags),
    image: req.body.image || "",
    reviews: [],
    createdAt: now,
    updatedAt: now
  });

  res.status(201).json({ product });
});

router.put("/:productId", authenticate, requireAdmin, (req, res) => {
  const patch = {};
  ["name", "category", "description", "image"].forEach((key) => {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  });
  if (req.body.price !== undefined) patch.price = Number(req.body.price);
  if (req.body.stock !== undefined) patch.stock = Number(req.body.stock);
  if (req.body.rating !== undefined) patch.rating = Number(req.body.rating);
  if (req.body.tags !== undefined) patch.tags = parseTags(req.body.tags);

  const product = productsRepository.update(req.params.productId, patch);
  if (!product) return res.status(404).json({ error: "Product not found." });
  return res.json({ product });
});

router.delete("/:productId", authenticate, requireAdmin, (req, res) => {
  if (!productsRepository.remove(req.params.productId)) {
    return res.status(404).json({ error: "Product not found." });
  }

  return res.json({ message: "Product deleted." });
});

module.exports = router;
