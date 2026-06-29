const { db, json, parseJson } = require("./database");

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    stock: row.stock,
    rating: row.rating,
    tags: parseJson(row.tags_json, []),
    image: row.image,
    reviews: parseJson(row.reviews_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function all() {
  return db.prepare("SELECT * FROM products ORDER BY created_at DESC, rowid DESC").all().map(toProduct);
}

function findById(id) {
  return toProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id));
}

function create(product) {
  db.prepare(`
    INSERT INTO products (
      id, name, category, description, price, stock, rating, tags_json,
      image, reviews_json, created_at, updated_at
    ) VALUES (
      @id, @name, @category, @description, @price, @stock, @rating, @tagsJson,
      @image, @reviewsJson, @createdAt, @updatedAt
    )
  `).run({
    ...product,
    tagsJson: json(product.tags || [], []),
    reviewsJson: json(product.reviews || [], []),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  });
  return findById(product.id);
}

function update(id, patch) {
  const current = findById(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE products
    SET name = @name,
        category = @category,
        description = @description,
        price = @price,
        stock = @stock,
        rating = @rating,
        tags_json = @tagsJson,
        image = @image,
        reviews_json = @reviewsJson,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({
    ...next,
    tagsJson: json(next.tags || [], []),
    reviewsJson: json(next.reviews || [], [])
  });
  return findById(id);
}

function remove(id) {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = {
  all,
  findById,
  create,
  update,
  remove
};
