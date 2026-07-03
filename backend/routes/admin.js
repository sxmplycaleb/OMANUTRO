const express = require("express");
const productsRepository = require("../repositories/products");
const ordersRepository = require("../repositories/orders");
const usersRepository = require("../repositories/users");
const rbac = require("../repositories/rbac");
const { authenticate, requirePermission } = require("../middleware/auth");
const { publicUser } = require("../services/store");

const router = express.Router();

router.use(authenticate, requirePermission("admin:access"));

router.get("/auth/me", (req, res) => {
  res.json({ user: publicUser(req.user) });
});

function can(user, permission) {
  return user.permissions?.includes("*") || user.permissions?.includes(permission);
}

function canAny(user, permissions) {
  return permissions.some((permission) => can(user, permission));
}

router.get("/dashboard", (req, res) => {
  const products = productsRepository.all();
  const orders = ordersRepository.all();
  const canProducts = canAny(req.user, ["products:manage", "inventory:manage", "products:quantities", "products:descriptions", "products:feature"]);
  const canOrders = canAny(req.user, ["orders:manage", "orders:view", "shipping:manage", "delivery:manage"]);
  const canCustomers = canAny(req.user, ["customers:view", "customer_notes:update", "staff:manage"]);
  const canFinance = canAny(req.user, ["payments:view", "reports:revenue", "reports:sales", "reports:finance", "reports:all", "analytics:view"]);
  const canAnalytics = canAny(req.user, ["analytics:view", "reports:sales", "reports:customers", "reports:products", "reports:inventory", "reports:all"]);
  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter((order) => String(order.createdAt || "").startsWith(today));
  const paidOrders = orders.filter((order) => !["Failed", "Refunded", "Cancelled"].includes(order.paymentStatus));
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const revenueToday = ordersToday
    .filter((order) => !["Failed", "Refunded", "Cancelled"].includes(order.paymentStatus))
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const recentOrders = orders.slice(0, 8);
  const outOfStock = products.filter((product) => Number(product.stock || 0) <= 0);
  const lowStockProducts = products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5);
  const lowStock = lowStockProducts.slice(0, 8);
  const users = usersRepository.all ? usersRepository.all() : [];
  const dayKey = (value) => String(value || "").slice(0, 10) || "Unscheduled";
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const revenueByDay = lastSevenDays.map((date) => ({
    label: date.slice(5),
    value: orders
      .filter((order) => dayKey(order.createdAt) === date)
      .reduce((sum, order) => sum + Number(order.total || 0), 0)
  }));
  const ordersByDay = lastSevenDays.map((date) => ({
    label: date.slice(5),
    value: orders.filter((order) => dayKey(order.createdAt) === date).length
  }));
  const productSales = new Map();
  const categorySales = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const name = item.name || item.productId || "Unknown";
      const quantity = Number(item.quantity || 0);
      productSales.set(name, (productSales.get(name) || 0) + quantity);
      const product = products.find((entry) => entry.id === item.productId);
      const category = product?.category || "Uncategorized";
      categorySales.set(category, (categorySales.get(category) || 0) + quantity);
    }
  }
  const toSortedSeries = (map) => Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const countByStatus = (status) => orders.filter((order) => order.status === status).length;
  const failedPayments = orders.filter((order) => order.paymentStatus === "Failed");

  res.json({
    roles: req.user.roles || [],
    permissions: req.user.permissions || [],
    kpis: {
      totalRevenue: canFinance ? revenue : 0,
      revenueToday: canFinance ? revenueToday : 0,
      totalOrders: canOrders ? orders.length : 0,
      activeCustomers: canCustomers ? users.filter((user) => !["admin", "super_admin"].includes(user.role)).length : 0,
      lowStockProducts: canProducts ? lowStockProducts.length : 0,
      outOfStockProducts: canProducts ? outOfStock.length : 0,
      totalProducts: canProducts ? products.length : 0,
      ordersToday: canOrders ? ordersToday.length : 0,
      revenue: canFinance ? revenue : 0
    },
    charts: {
      revenueByDay: canFinance || canAnalytics ? revenueByDay : [],
      ordersByDay: canOrders || canAnalytics ? ordersByDay : [],
      bestSellingProducts: canAnalytics ? toSortedSeries(productSales) : [],
      salesByCategory: canAnalytics ? toSortedSeries(categorySales) : []
    },
    orderCards: {
      pending: canOrders ? countByStatus("Pending") : 0,
      processing: canOrders ? countByStatus("Processing") : 0,
      completed: canOrders ? countByStatus("Completed") : 0,
      cancelled: canOrders ? countByStatus("Cancelled") : 0,
      refunded: canFinance || canOrders ? orders.filter((order) => order.paymentStatus === "Refunded").length : 0
    },
    products: canProducts ? products : [],
    orders: canOrders ? orders : [],
    recentOrders: canOrders ? recentOrders : [],
    lowStock: canProducts ? lowStock : [],
    outOfStock: canProducts ? outOfStock : [],
    failedPayments: canFinance ? failedPayments.slice(0, 8) : [],
    recentActivity: canOrders ? recentOrders.map((order) => ({
      label: `Order ${order.id} is ${order.status}`,
      at: order.createdAt
    })) : [],
    users: canCustomers ? users.map((user) => publicUser({ ...user, ...rbac.accessForUser(user) })) : [],
    latestUsers: canCustomers ? users.slice(0, 8).map((user) => publicUser({ ...user, ...rbac.accessForUser(user) })) : []
  });
});

router.get("/rbac", requirePermission("staff:manage"), (req, res) => {
  res.json({
    roles: rbac.allRoles(),
    permissions: rbac.allPermissions()
  });
});

router.put("/users/:userId/roles", requirePermission("staff:manage"), (req, res) => {
  const user = usersRepository.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  rbac.replaceRoles(user.id, req.body.roleIds || [], req.user.id);
  const nextUser = usersRepository.findById(req.params.userId);
  res.json({ user: publicUser({ ...nextUser, ...rbac.accessForUser(nextUser) }) });
});

module.exports = router;
