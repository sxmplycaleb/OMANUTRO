const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DB_FILE = path.join(__dirname, "..", "..", "data", "commerce.sqlite");
const SEED_FILE = path.join(__dirname, "..", "..", "db.json");
const DB_FILE = process.env.SQLITE_DB_FILE || DEFAULT_DB_FILE;

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function json(value, fallback = null) {
  if (value === undefined) return fallback === null ? null : JSON.stringify(fallback);
  return JSON.stringify(value);
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      password_hash TEXT NOT NULL,
      dob TEXT,
      gender TEXT,
      username TEXT,
      bio TEXT,
      phone_verified_at TEXT,
      email_verified_at TEXT,
      password_reset_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      image TEXT,
      reviews_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_provider TEXT NOT NULL,
      mpesa_phone TEXT,
      mpesa_checkout_request_id TEXT,
      mpesa_merchant_request_id TEXT,
      mpesa_response_json TEXT,
      mpesa_result_json TEXT,
      timeline_json TEXT NOT NULL DEFAULT '[]',
      stock_reduced_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout ON orders(mpesa_checkout_request_id);

    CREATE TABLE IF NOT EXISTS verification_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_verifications_type ON verification_records(type);
  `);
}

function rowCount(table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function seedFromJson() {
  if (!fs.existsSync(SEED_FILE) || rowCount("users") || rowCount("products") || rowCount("orders")) return;

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, email, name, phone, role, password_hash, dob, gender, username, bio,
      phone_verified_at, email_verified_at, password_reset_json, created_at
    ) VALUES (
      @id, @email, @name, @phone, @role, @passwordHash, @dob, @gender, @username, @bio,
      @phoneVerifiedAt, @emailVerifiedAt, @passwordResetJson, @createdAt
    )
  `);
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (
      id, name, category, description, price, stock, rating, tags_json, image,
      reviews_json, created_at, updated_at
    ) VALUES (
      @id, @name, @category, @description, @price, @stock, @rating, @tagsJson, @image,
      @reviewsJson, @createdAt, @updatedAt
    )
  `);
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, user_id, customer_json, items_json, shipping_address_json, subtotal,
      shipping, tax, total, status, payment_status, payment_provider, mpesa_phone,
      mpesa_checkout_request_id, mpesa_merchant_request_id, mpesa_response_json,
      mpesa_result_json, timeline_json, stock_reduced_at, created_at
    ) VALUES (
      @id, @userId, @customerJson, @itemsJson, @shippingAddressJson, @subtotal,
      @shipping, @tax, @total, @status, @paymentStatus, @paymentProvider, @mpesaPhone,
      @mpesaCheckoutRequestId, @mpesaMerchantRequestId, @mpesaResponseJson,
      @mpesaResultJson, @timelineJson, @stockReducedAt, @createdAt
    )
  `);
  const insertVerification = db.prepare(`
    INSERT INTO verification_records (
      id, type, email, phone, code_hash, expires_at, created_at
    ) VALUES (
      @id, @type, @email, @phone, @codeHash, @expiresAt, @createdAt
    )
  `);

  db.transaction(() => {
    for (const user of seed.users || []) {
      insertUser.run({
        ...user,
        phone: user.phone || null,
        dob: user.dob || null,
        gender: user.gender || null,
        username: user.username || null,
        bio: user.bio || null,
        phoneVerifiedAt: user.phoneVerifiedAt || null,
        emailVerifiedAt: user.emailVerifiedAt || null,
        passwordResetJson: json(user.passwordReset),
        createdAt: user.createdAt || new Date().toISOString()
      });
    }

    for (const product of seed.products || []) {
      insertProduct.run({
        ...product,
        description: product.description || "",
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        rating: Number(product.rating || 0),
        tagsJson: json(Array.isArray(product.tags) ? product.tags : String(product.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean), []),
        reviewsJson: json(product.reviews || [], []),
        image: product.image || "",
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: product.updatedAt || product.createdAt || new Date().toISOString()
      });
    }

    for (const order of seed.orders || []) {
      if (!db.prepare("SELECT id FROM users WHERE id = ?").get(order.userId)) continue;
      insertOrder.run({
        ...order,
        customerJson: json(order.customer || {}, {}),
        itemsJson: json(order.items || [], []),
        shippingAddressJson: json(order.shippingAddress || {}, {}),
        paymentStatus: order.paymentStatus || "Pending",
        paymentProvider: order.paymentProvider || "m-pesa",
        mpesaPhone: order.mpesaPhone || null,
        mpesaCheckoutRequestId: order.mpesaCheckoutRequestId || null,
        mpesaMerchantRequestId: order.mpesaMerchantRequestId || null,
        mpesaResponseJson: json(order.mpesaResponse),
        mpesaResultJson: json(order.mpesaResult),
        timelineJson: json(order.timeline || [], []),
        stockReducedAt: order.stockReducedAt || null,
        createdAt: order.createdAt || new Date().toISOString()
      });
    }

    for (const verification of seed.signupVerifications || []) {
      insertVerification.run({ ...verification, type: "signup" });
    }
  })();
}

createSchema();
seedFromJson();

module.exports = {
  db,
  json,
  parseJson
};
