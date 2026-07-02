const crypto = require("crypto");
const { db, parseJson } = require("./database");

function toWishlistItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    createdAt: row.created_at,
    product: row.product_name ? {
      id: row.product_id,
      name: row.product_name,
      category: row.category,
      description: row.description,
      price: row.price,
      stock: row.stock,
      rating: row.rating,
      tags: parseJson(row.tags_json, []),
      image: row.image,
      reviews: parseJson(row.reviews_json, []),
      createdAt: row.product_created_at,
      updatedAt: row.updated_at
    } : null
  };
}

function allForUser(userId) {
  return db.prepare(`
    SELECT wishlist_items.*,
           products.name AS product_name,
           products.category,
           products.description,
           products.price,
           products.stock,
           products.rating,
           products.tags_json,
           products.image,
           products.reviews_json,
           products.created_at AS product_created_at,
           products.updated_at
    FROM wishlist_items
    INNER JOIN products ON products.id = wishlist_items.product_id
    WHERE wishlist_items.user_id = ?
    ORDER BY wishlist_items.created_at DESC
  `).all(userId).map(toWishlistItem);
}

function add(userId, productId) {
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) {
    throw new Error("Product not found.");
  }

  db.prepare(`
    INSERT INTO wishlist_items (id, user_id, product_id, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, product_id) DO NOTHING
  `).run(`wish_${crypto.randomBytes(8).toString("hex")}`, userId, productId, new Date().toISOString());

  return allForUser(userId);
}

function remove(userId, idOrProductId) {
  db.prepare(`
    DELETE FROM wishlist_items
    WHERE user_id = ?
      AND (id = ? OR product_id = ?)
  `).run(userId, idOrProductId, idOrProductId);
  return allForUser(userId);
}

function countForUser(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM wishlist_items WHERE user_id = ?").get(userId).count;
}

module.exports = {
  allForUser,
  add,
  remove,
  countForUser
};
