const crypto = require("crypto");
const { db, json, parseJson } = require("./database");

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined && value[key] !== null && value[key] !== "") {
          acc[key] = stableValue(value[key]);
        }
        return acc;
      }, {});
  }
  return value;
}

function variantKey(options) {
  return JSON.stringify(stableValue(options || {}));
}

function toCartItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantity: row.quantity,
    options: parseJson(row.options_json, {}),
    variantKey: row.variant_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeItem(item) {
  const options = stableValue(item.options || item.variant || {});
  return {
    productId: String(item.productId || "").trim(),
    quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
    options,
    variantKey: variantKey(options)
  };
}

function validItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(normalizeItem)
    .filter((item) => item.productId);
}

function allForUser(userId) {
  return db.prepare(`
    SELECT cart_items.*
    FROM cart_items
    INNER JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = ?
      AND products.stock > 0
    ORDER BY cart_items.created_at ASC
  `).all(userId).map(toCartItem);
}

function removeUnavailable(userId) {
  db.prepare(`
    DELETE FROM cart_items
    WHERE user_id = ?
      AND NOT EXISTS (
        SELECT 1
        FROM products
        WHERE products.id = cart_items.product_id
          AND products.stock > 0
      )
  `).run(userId);
}

function replaceForUser(userId, items) {
  const now = new Date().toISOString();
  const normalized = validItems(items);
  const insertItem = db.prepare(`
    INSERT INTO cart_items (
      id, user_id, product_id, quantity, options_json, variant_key, created_at, updated_at
    ) VALUES (
      @id, @userId, @productId, @quantity, @optionsJson, @variantKey, @createdAt, @updatedAt
    )
    ON CONFLICT(user_id, product_id, variant_key) DO UPDATE SET
      quantity = excluded.quantity,
      options_json = excluded.options_json,
      updated_at = excluded.updated_at
  `);

  db.transaction(() => {
    db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(userId);
    for (const item of normalized) {
      if (!db.prepare("SELECT id FROM products WHERE id = ? AND stock > 0").get(item.productId)) continue;
      insertItem.run({
        id: `cart_${crypto.randomBytes(8).toString("hex")}`,
        userId,
        productId: item.productId,
        quantity: item.quantity,
        optionsJson: json(item.options, {}),
        variantKey: item.variantKey,
        createdAt: now,
        updatedAt: now
      });
    }
  })();

  return allForUser(userId);
}

function mergeForUser(userId, items) {
  const now = new Date().toISOString();
  const insertItem = db.prepare(`
    INSERT INTO cart_items (
      id, user_id, product_id, quantity, options_json, variant_key, created_at, updated_at
    ) VALUES (
      @id, @userId, @productId, @quantity, @optionsJson, @variantKey, @createdAt, @updatedAt
    )
    ON CONFLICT(user_id, product_id, variant_key) DO UPDATE SET
      quantity = cart_items.quantity + excluded.quantity,
      options_json = excluded.options_json,
      updated_at = excluded.updated_at
  `);

  db.transaction(() => {
    removeUnavailable(userId);
    for (const item of validItems(items)) {
      if (!db.prepare("SELECT id FROM products WHERE id = ? AND stock > 0").get(item.productId)) continue;
      insertItem.run({
        id: `cart_${crypto.randomBytes(8).toString("hex")}`,
        userId,
        productId: item.productId,
        quantity: item.quantity,
        optionsJson: json(item.options, {}),
        variantKey: item.variantKey,
        createdAt: now,
        updatedAt: now
      });
    }
  })();

  return allForUser(userId);
}

function updateItem(userId, itemId, quantity) {
  const nextQuantity = Math.trunc(Number(quantity) || 0);
  if (nextQuantity < 1) {
    removeItem(userId, itemId);
    return allForUser(userId);
  }

  db.prepare(`
    UPDATE cart_items
    SET quantity = ?, updated_at = ?
    WHERE user_id = ? AND id = ?
  `).run(nextQuantity, new Date().toISOString(), userId, itemId);

  return allForUser(userId);
}

function removeItem(userId, itemId) {
  db.prepare("DELETE FROM cart_items WHERE user_id = ? AND id = ?").run(userId, itemId);
  return allForUser(userId);
}

function clearForUser(userId) {
  db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(userId);
  return [];
}

module.exports = {
  allForUser,
  mergeForUser,
  replaceForUser,
  updateItem,
  removeItem,
  clearForUser
};
