const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { createUploadthingExpressHandler } = require("uploadthing/express");
const { ourFileRouter } = require("./config/uploadthing");
const config = require("./config");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const accountRoutes = require("./routes/account");
const addressRoutes = require("./routes/addresses");
const wishlistRoutes = require("./routes/wishlist");
const savedJobRoutes = require("./routes/saved-jobs");
const applicationRoutes = require("./routes/applications");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const cartRoutes = require("./routes/cart");
const messagingRoutes = require("./routes/messaging");
const adminMessagingRoutes = require("./routes/admin-messaging");
const { validateMessagingStartupConfig } = require("./services/messaging/startup");

const PUBLIC_DIR = path.join(__dirname, "..", "frontend");
const ADMIN_DIR = path.join(__dirname, "..", "public", "admin");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function serveStatic(req, res) {
  const requestedPath = req.path === "/" ? "/index.html" : decodeURIComponent(req.path);
  let filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    filePath = `${filePath}.html`;
  }

  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }

  res.type(MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

function createApp() {
  validateMessagingStartupConfig();

  const app = express();

  app.use((req, res, next) => {
    req.requestId = req.headers["x-request-id"] || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false }));

  app.use("/admin", express.static(ADMIN_DIR));
  app.get(/^\/dashboard(?:\/.*)?$/, (req, res) => {
    res.type("text/html; charset=utf-8");
    fs.createReadStream(path.join(PUBLIC_DIR, "dashboard.html")).pipe(res);
  });
  app.use("/admin/messaging", adminMessagingRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/addresses", addressRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/saved-jobs", savedJobRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/messaging", messagingRoutes);
  app.post("/api/mpesa/callback", orderRoutes.mpesaCallback);
  app.use(
    "/api/uploadthing",
    createUploadthingExpressHandler({
      router: ourFileRouter,
      config: {
        uploadthingSecret: process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_TOKEN
      }
    })
  );

  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "API endpoint not found." });
      return;
    }
    serveStatic(req, res);
  });

  app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error({ requestId: req.requestId, error });
    res.status(statusCode).json({
      error: error.message || "Something went wrong.",
      requestId: req.requestId
    });
  });

  return app;
}

module.exports = {
  createApp
};
