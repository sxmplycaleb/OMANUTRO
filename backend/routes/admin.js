const express = require("express");
const productsRepository = require("../repositories/products");
const ordersRepository = require("../repositories/orders");
const usersRepository = require("../repositories/users");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { publicUser } = require("../services/store");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/auth/me", (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get("/dashboard", (req, res) => {
  const products = productsRepository.all();
  const orders = ordersRepository.all();
  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter((order) => String(order.createdAt || "").startsWith(today));
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const recentOrders = orders.slice(0, 8);
  const lowStock = products
    .filter((product) => Number(product.stock || 0) <= 5)
    .slice(0, 8);
  const users = usersRepository.all ? usersRepository.all() : [];

  res.json({
    kpis: {
      totalProducts: products.length,
      ordersToday: ordersToday.length,
      revenue
    },
    recentOrders,
    lowStock,
    recentActivity: recentOrders.map((order) => ({
      label: `Order ${order.id} is ${order.status}`,
      at: order.createdAt
    })),
    users: users.map(publicUser)
  });
});

module.exports = router;
