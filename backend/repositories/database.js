const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const config = require("../config");
const { hashPassword } = require("../services/store");

const SEED_FILE = path.join(config.rootDir, "db.json");
const DB_FILE = config.sqliteFile;

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma(`busy_timeout = ${config.sqliteBusyTimeoutMs}`);

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
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      phone_normalized TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      password_hash TEXT NOT NULL,
      dob TEXT,
      gender TEXT,
      username TEXT,
      bio TEXT,
      phone_verified_at TEXT,
      email_verified_at TEXT,
      password_reset_json TEXT,
      reset_token_hash TEXT,
      reset_expires_at TEXT,
      firebase_uid TEXT,
      avatar_url TEXT,
      avatar_key TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone_normalized ON users(phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash ON users(reset_token_hash);

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
      image_key TEXT,
      reviews_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT,
      checkout_attempt_id TEXT,
      user_id TEXT NOT NULL,
      customer_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES',
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_provider TEXT NOT NULL,
      mpesa_phone TEXT,
      mpesa_checkout_request_id TEXT,
      mpesa_merchant_request_id TEXT,
      mpesa_transaction_reference TEXT,
      mpesa_amount REAL,
      mpesa_receipt_number TEXT,
      mpesa_transaction_date TEXT,
      mpesa_callback_received_at TEXT,
      mpesa_response_json TEXT,
      mpesa_result_json TEXT,
      timeline_json TEXT NOT NULL DEFAULT '[]',
      stock_reduced_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout ON orders(mpesa_checkout_request_id);

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      options_json TEXT NOT NULL DEFAULT '{}',
      variant_key TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_variant
      ON cart_items(user_id, product_id, variant_key);
    CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      county TEXT,
      city TEXT NOT NULL,
      area TEXT,
      street TEXT,
      building TEXT,
      notes TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_user_product
      ON wishlist_items(user_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);

    CREATE TABLE IF NOT EXISTS saved_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      department TEXT,
      job_type TEXT,
      location TEXT,
      level TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_jobs_user_title
      ON saved_jobs(user_id, title);
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

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

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function addColumnIfMissing(table, definition) {
  const column = definition.split(/\s+/)[0];
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function migrateUserLookupColumns() {
  addColumnIfMissing("users", "phone_normalized TEXT");
  addColumnIfMissing("users", "reset_token_hash TEXT");
  addColumnIfMissing("users", "reset_expires_at TEXT");

  const users = db.prepare("SELECT id, phone, password_reset_json FROM users").all();
  const updateUser = db.prepare(`
    UPDATE users
    SET phone_normalized = @phoneNormalized,
        reset_token_hash = @resetTokenHash,
        reset_expires_at = @resetExpiresAt
    WHERE id = @id
  `);

  for (const user of users) {
    const reset = parseJson(user.password_reset_json, null);
    updateUser.run({
      id: user.id,
      phoneNormalized: normalizePhone(user.phone) || null,
      resetTokenHash: reset?.resetTokenHash || null,
      resetExpiresAt: reset?.expiresAt || null
    });
  }
}

function duplicateEmails() {
  return db.prepare(`
    SELECT lower(email) AS email_key, COUNT(*) AS count, group_concat(id) AS user_ids
    FROM users
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  `).all();
}

function migrateFirebaseUserColumns() {
  addColumnIfMissing("users", "firebase_uid TEXT");
  addColumnIfMissing("users", "avatar_url TEXT");
  addColumnIfMissing("users", "avatar_key TEXT");

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL");

  const duplicateEmailRows = duplicateEmails();
  if (duplicateEmailRows.length) {
    console.warn("Duplicate user emails detected. Resolve these before enabling case-insensitive email uniqueness.", duplicateEmailRows);
    return;
  }

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email))");
}

function migrateUploadThingKeys() {
  addColumnIfMissing("users", "avatar_key TEXT");
  addColumnIfMissing("products", "image_key TEXT");
}

function migrateCartItems() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      options_json TEXT NOT NULL DEFAULT '{}',
      variant_key TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_variant
      ON cart_items(user_id, product_id, variant_key);
    CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
  `);
}

function migrateSecureCheckoutColumns() {
  addColumnIfMissing("orders", "order_number TEXT");
  addColumnIfMissing("orders", "checkout_attempt_id TEXT");
  addColumnIfMissing("orders", "currency TEXT NOT NULL DEFAULT 'KES'");
  addColumnIfMissing("orders", "mpesa_transaction_reference TEXT");
  addColumnIfMissing("orders", "mpesa_amount REAL");
  addColumnIfMissing("orders", "mpesa_receipt_number TEXT");
  addColumnIfMissing("orders", "mpesa_transaction_date TEXT");
  addColumnIfMissing("orders", "mpesa_callback_received_at TEXT");

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number
      ON orders(order_number)
      WHERE order_number IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_attempt
      ON orders(user_id, checkout_attempt_id)
      WHERE checkout_attempt_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mpesa_checkout_unique
      ON orders(mpesa_checkout_request_id)
      WHERE mpesa_checkout_request_id IS NOT NULL;
  `);
}

function migrateAccountDashboardTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      county TEXT,
      city TEXT NOT NULL,
      area TEXT,
      street TEXT,
      building TEXT,
      notes TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_user_product
      ON wishlist_items(user_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);
  `);
}

function migrateSavedJobsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      department TEXT,
      job_type TEXT,
      location TEXT,
      level TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_jobs_user_title
      ON saved_jobs(user_id, title);
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
  `);
}

const ROLE_PERMISSION_MAP = {
  customer: [
    "profile:manage_own", "addresses:manage_own", "wishlist:manage_own", "orders:view_own", "checkout:create"
  ],
  super_admin: [
    "*", "staff:manage", "settings:manage", "firebase:manage", "mpesa:settings",
    "security:manage", "reports:all", "logs:view"
  ],
  store_manager: [
    "admin:access", "dashboard:view", "products:manage", "categories:manage", "collections:manage",
    "inventory:manage", "orders:manage", "customers:view", "marketing:banners", "collections:feature"
  ],
  finance: [
    "admin:access", "dashboard:view", "payments:view", "payments:manage", "mpesa:manage",
    "refunds:manage", "reports:revenue", "reports:sales", "reports:finance", "reports:tax", "exports:finance"
  ],
  inventory: ["admin:access", "inventory:manage", "inventory:adjust", "sku:manage", "products:quantities"],
  fulfillment: ["admin:access", "orders:manage", "shipping:manage", "packing:manage", "delivery:manage", "invoices:print", "packing_slips:print"],
  customer_support: ["admin:access", "customers:view", "orders:view", "customer_notes:update", "orders:cancel"],
  marketing: ["admin:access", "marketing:banners", "products:feature", "coupons:manage", "discounts:manage", "campaigns:manage", "marketing:analytics"],
  content: ["admin:access", "content:manage", "about:manage", "homepage:manage", "products:descriptions", "images:manage", "collections:manage", "lookbooks:manage"],
  analytics: ["admin:access", "dashboard:view", "reports:sales", "reports:customers", "reports:products", "reports:inventory", "analytics:view"],
  developer: ["admin:access", "logs:view", "api:monitor", "integrations:manage", "debug:tools", "feature_flags:manage"]
};

const ROLE_DESCRIPTIONS = {
  customer: "Customer account access",
  super_admin: "Full unrestricted system access",
  store_manager: "Store operations and catalog management",
  finance: "Payments and finance reports",
  inventory: "Stock and inventory management",
  fulfillment: "Order fulfillment and shipping",
  customer_support: "Customer and order support",
  marketing: "Marketing campaigns and promotions",
  content: "Content and media management",
  analytics: "Read-only analytics and reports",
  developer: "Technical tools and integrations"
};

function migrateRbacTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  `);

  const now = new Date().toISOString();
  const insertRole = db.prepare("INSERT OR IGNORE INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?)");
  const insertPermission = db.prepare("INSERT OR IGNORE INTO permissions (id, name, description, created_at) VALUES (?, ?, ?, ?)");
  const linkPermission = db.prepare("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  const linkUserRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, ?)");

  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MAP)) {
    insertRole.run(role, role, ROLE_DESCRIPTIONS[role] || role, now);
    for (const permission of permissions) {
      insertPermission.run(permission, permission, permission, now);
      linkPermission.run(role, permission);
    }
  }

  for (const user of db.prepare("SELECT id, role FROM users").all()) {
    const roleId = user.role === "admin" ? "super_admin" : user.role || "customer";
    linkUserRole.run(user.id, ROLE_PERMISSION_MAP[roleId] ? roleId : "customer", now);
  }
}

const MIGRATIONS = [
  {
    version: 1,
    name: "add_normalized_user_lookup_columns",
    up: migrateUserLookupColumns
  },
  {
    version: 2,
    name: "add_query_indexes",
    up() {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_phone_normalized ON users(phone_normalized);
        CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash ON users(reset_token_hash);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
        CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
        CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
        CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout ON orders(mpesa_checkout_request_id);
      `);
    }
  },
  {
    version: 3,
    name: "add_firebase_user_columns",
    up: migrateFirebaseUserColumns
  },
  {
    version: 4,
    name: "add_cart_items",
    up: migrateCartItems
  },
  {
    version: 5,
    name: "add_secure_checkout_columns",
    up: migrateSecureCheckoutColumns
  },
  {
    version: 6,
    name: "add_account_dashboard_tables",
    up: migrateAccountDashboardTables
  },
  {
    version: 7,
    name: "add_rbac_tables",
    up: migrateRbacTables
  },
  {
    version: 8,
    name: "add_saved_jobs_table",
    up: migrateSavedJobsTable
  },
  {
    version: 9,
    name: "add_uploadthing_file_keys",
    up: migrateUploadThingKeys
  }
];

function runMigrations() {
  const hasMigration = db.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").pluck();
  const insertMigration = db.prepare(`
    INSERT INTO schema_migrations (version, name, applied_at)
    VALUES (?, ?, ?)
  `);

  for (const migration of MIGRATIONS) {
    if (hasMigration.get(migration.version)) continue;
    db.transaction(() => {
      migration.up();
      insertMigration.run(migration.version, migration.name, new Date().toISOString());
    })();
  }
}

function rowCount(table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function seedFromJson() {
  if (!fs.existsSync(SEED_FILE) || rowCount("users") || rowCount("products") || rowCount("orders")) return;

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, email, name, phone, phone_normalized, role, password_hash, dob, gender, username, bio,
      phone_verified_at, email_verified_at, password_reset_json, reset_token_hash, reset_expires_at,
      firebase_uid, avatar_url, avatar_key, created_at
    ) VALUES (
      @id, @email, @name, @phone, @phoneNormalized, @role, @passwordHash, @dob, @gender, @username, @bio,
      @phoneVerifiedAt, @emailVerifiedAt, @passwordResetJson, @resetTokenHash, @resetExpiresAt,
      @firebaseUid, @avatarUrl, @avatarKey, @createdAt
    )
  `);
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (
      id, name, category, description, price, stock, rating, tags_json, image, image_key,
      reviews_json, created_at, updated_at
    ) VALUES (
      @id, @name, @category, @description, @price, @stock, @rating, @tagsJson, @image, @imageKey,
      @reviewsJson, @createdAt, @updatedAt
    )
  `);
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, checkout_attempt_id, user_id, customer_json, items_json, shipping_address_json,
      subtotal, shipping, tax, total, currency, status, payment_status, payment_provider, mpesa_phone,
      mpesa_checkout_request_id, mpesa_merchant_request_id, mpesa_transaction_reference, mpesa_amount,
      mpesa_receipt_number, mpesa_transaction_date, mpesa_callback_received_at, mpesa_response_json,
      mpesa_result_json, timeline_json, stock_reduced_at, created_at
    ) VALUES (
      @id, @orderNumber, @checkoutAttemptId, @userId, @customerJson, @itemsJson, @shippingAddressJson,
      @subtotal, @shipping, @tax, @total, @currency, @status, @paymentStatus, @paymentProvider, @mpesaPhone,
      @mpesaCheckoutRequestId, @mpesaMerchantRequestId, @mpesaTransactionReference, @mpesaAmount,
      @mpesaReceiptNumber, @mpesaTransactionDate, @mpesaCallbackReceivedAt, @mpesaResponseJson,
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
      const passwordReset = user.passwordReset || null;
      insertUser.run({
        ...user,
        phone: user.phone || null,
        phoneNormalized: normalizePhone(user.phone) || null,
        dob: user.dob || null,
        gender: user.gender || null,
        username: user.username || null,
        bio: user.bio || null,
        phoneVerifiedAt: user.phoneVerifiedAt || null,
        emailVerifiedAt: user.emailVerifiedAt || null,
        passwordResetJson: json(passwordReset),
        resetTokenHash: passwordReset?.resetTokenHash || null,
        resetExpiresAt: passwordReset?.expiresAt || null,
        firebaseUid: user.firebaseUid || null,
        avatarUrl: user.avatarUrl || null,
        avatarKey: user.avatarKey || null,
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
        imageKey: product.imageKey || "",
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
        orderNumber: order.orderNumber || null,
        checkoutAttemptId: order.checkoutAttemptId || null,
        currency: order.currency || "KES",
        mpesaTransactionReference: order.mpesaTransactionReference || null,
        mpesaAmount: order.mpesaAmount || null,
        mpesaReceiptNumber: order.mpesaReceiptNumber || null,
        mpesaTransactionDate: order.mpesaTransactionDate || null,
        mpesaCallbackReceivedAt: order.mpesaCallbackReceivedAt || null,
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

function ensureRequiredAdminUser() {
  const now = new Date().toISOString();
  const adminEmail = "business.omanutro@gmail.com";
  const adminPasswordHash = hashPassword("Admin123!");
  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(adminEmail);
  const userId = existing?.id || "admin_business_omanutro";

  db.transaction(() => {
    if (existing) {
      db.prepare(`
        UPDATE users
        SET name = ?,
            role = ?,
            email_verified_at = COALESCE(email_verified_at, ?)
        WHERE id = ?
      `).run("Omanutro Administrator", "super_admin", now, userId);
    } else {
      db.prepare(`
        INSERT INTO users (
          id, email, name, phone, phone_normalized, role, password_hash, dob, gender, username, bio,
          phone_verified_at, email_verified_at, password_reset_json, reset_token_hash, reset_expires_at,
          firebase_uid, avatar_url, avatar_key, created_at
        ) VALUES (
          @id, @email, @name, NULL, NULL, @role, @passwordHash, NULL, NULL, NULL, NULL,
          NULL, @emailVerifiedAt, NULL, NULL, NULL,
          NULL, NULL, NULL, @createdAt
        )
      `).run({
        id: userId,
        email: adminEmail,
        name: "Omanutro Administrator",
        role: "super_admin",
        passwordHash: adminPasswordHash,
        emailVerifiedAt: now,
        createdAt: now
      });
    }

    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, ?)")
      .run(userId, "super_admin", now);
  })();
}

createSchema();
runMigrations();
seedFromJson();
ensureRequiredAdminUser();

module.exports = {
  db,
  json,
  parseJson
};
