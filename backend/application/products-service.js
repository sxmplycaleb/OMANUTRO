const crypto = require("crypto");
const productsRepository = require("../repositories/products");
const { notFound } = require("../http/errors");
const { deleteUploadThingFile, uploadChanged } = require("../lib/uploadthing/files");

function parseTags(tags) {
  return Array.isArray(tags)
    ? tags
    : String(tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function listProducts(query) {
  const result = productsRepository.list(query);
  return {
    products: result.products,
    categories: productsRepository.categories(),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit
    }
  };
}

function suggestions(query) {
  return productsRepository.suggestions(query.search);
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
    imageKey: body.imageKey || "",
    reviews: [],
    createdAt: now,
    updatedAt: now
  });
}

async function updateProduct(productId, body) {
  const patch = {};
  ["name", "category", "description", "image", "imageKey"].forEach((key) => {
    if (body[key] !== undefined) patch[key] = body[key];
  });
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.stock !== undefined) patch.stock = Number(body.stock);
  if (body.rating !== undefined) patch.rating = Number(body.rating);
  if (body.tags !== undefined) patch.tags = parseTags(body.tags);

  const current = productsRepository.findById(productId);
  if (!current) throw notFound("Product not found.");
  const product = productsRepository.update(productId, patch);
  if (!product) throw notFound("Product not found.");
  if (uploadChanged(current.imageKey, body.imageKey)) {
    await deleteUploadThingFile(current.imageKey);
  }
  return product;
}

async function deleteProduct(productId) {
  const current = productsRepository.findById(productId);
  if (!current) throw notFound("Product not found.");
  await deleteUploadThingFile(current.imageKey);
  if (!current || !productsRepository.remove(productId)) {
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
