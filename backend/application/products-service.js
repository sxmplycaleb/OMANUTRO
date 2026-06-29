const crypto = require("crypto");
const productsRepository = require("../repositories/products");
const { notFound } = require("../http/errors");

function productTags(product) {
  if (Array.isArray(product.tags)) return product.tags;
  return String(product.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function productText(product) {
  return `${product.name} ${product.category} ${product.description} ${productTags(product).join(" ")}`.toLowerCase();
}

function parseTags(tags) {
  return Array.isArray(tags)
    ? tags
    : String(tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
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

function listProducts(query) {
  const products = productsRepository.all();
  const categories = [...new Set(products.map((product) => product.category))].sort();
  return {
    products: filterProducts(products, query),
    categories
  };
}

function suggestions(query) {
  const search = String(query.search || "").trim().toLowerCase();
  return productsRepository.all()
    .filter((product) => search && productText(product).includes(search))
    .flatMap((product) => [product.name, product.category, ...productTags(product)])
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((entry) => entry.toLowerCase() === value.toLowerCase()) === index)
    .slice(0, 8);
}

function createProduct(body) {
  const now = new Date().toISOString();
  return productsRepository.create({
    id: `prod_${crypto.randomBytes(8).toString("hex")}`,
    name: body.name,
    category: body.category,
    description: body.description,
    price: Number(body.price || 0),
    stock: Number(body.stock || 0),
    rating: Number(body.rating || 0),
    tags: parseTags(body.tags),
    image: body.image || "",
    reviews: [],
    createdAt: now,
    updatedAt: now
  });
}

function updateProduct(productId, body) {
  const patch = {};
  ["name", "category", "description", "image"].forEach((key) => {
    if (body[key] !== undefined) patch[key] = body[key];
  });
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.stock !== undefined) patch.stock = Number(body.stock);
  if (body.rating !== undefined) patch.rating = Number(body.rating);
  if (body.tags !== undefined) patch.tags = parseTags(body.tags);

  const product = productsRepository.update(productId, patch);
  if (!product) throw notFound("Product not found.");
  return product;
}

function deleteProduct(productId) {
  if (!productsRepository.remove(productId)) {
    throw notFound("Product not found.");
  }

  return { message: "Product deleted." };
}

module.exports = {
  listProducts,
  suggestions,
  createProduct,
  updateProduct,
  deleteProduct
};
