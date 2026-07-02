const express = require("express");
const ordersService = require("../application/orders-service");
const { authenticate, requirePermission } = require("../middleware/auth");
const asyncHandler = require("../http/async-handler");
const rbac = require("../repositories/rbac");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
  res.json({ orders: ordersService.listOrders(req.user) });
});

router.post("/", asyncHandler(async (req, res) => {
  const order = await ordersService.createOrder(req.user, req.body);
  res.status(201).json({
    order,
    message: "M-Pesa prompt sent. The order will be accepted after payment confirmation."
  });
}));

router.put("/:orderId", requirePermission("orders:manage"), asyncHandler(async (req, res) => {
  const order = await ordersService.updateStatus(req.params.orderId, req.body.status);
  rbac.log(req.user.id, "order.status_updated", "order", order.id, { status: order.status });
  res.json({ order });
}));

const handleMpesaCallback = asyncHandler(async (req, res) => {
  res.json(await ordersService.applyMpesaCallback(req.body));
});

router.mpesaCallback = handleMpesaCallback;

module.exports = router;
