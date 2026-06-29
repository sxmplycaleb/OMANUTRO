const crypto = require("crypto");
const express = require("express");
const orders = require("../repositories/orders");
const products = require("../repositories/products");
const { publicUser } = require("../services/store");
const { initiateStkPush } = require("../services/mpesa");
const { normalizePhone, sendOrderStatus } = require("../services/whatsapp");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function buildOrderItems(requestedItems) {
  const orderItems = [];

  for (const item of requestedItems) {
    const quantity = Number(item.quantity || 0);
    const product = products.findById(item.productId);

    if (!product || quantity < 1) {
      return { error: "Your cart contains an unavailable product." };
    }

    if (product.stock < quantity) {
      return { error: `${product.name} does not have enough stock.` };
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      subtotal: Number((product.price * quantity).toFixed(2))
    });
  }

  return { orderItems };
}

router.use(authenticate);

router.get("/", (req, res) => {
  const userOrders = req.user.role === "admin"
    ? orders.all()
    : orders.forUser(req.user.id);

  res.json({ orders: userOrders });
});

router.post("/", async (req, res, next) => {
  try {
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) return res.status(400).json({ error: "Add products to your cart first." });

    if (req.body.paymentMethod !== "m-pesa") {
      return res.status(400).json({
        error: "Only confirmed M-Pesa checkout is enabled. Add Stripe/PayPal credentials before accepting card or PayPal orders."
      });
    }

    const mpesaPhone = normalizePhone(req.body.mpesaPhone || req.user.phone);
    if (!mpesaPhone) return res.status(400).json({ error: "Enter the M-Pesa phone number." });

    const { orderItems, error } = buildOrderItems(requestedItems);
    if (error) return res.status(400).json({ error });

    const subtotal = Number(orderItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    const shipping = subtotal >= 100 ? 0 : 12;
    const tax = Number((subtotal * 0.08).toFixed(2));
    const now = new Date().toISOString();
    const order = {
      id: `ord_${crypto.randomBytes(8).toString("hex")}`,
      userId: req.user.id,
      customer: publicUser(req.user),
      items: orderItems,
      shippingAddress: req.body.shippingAddress || {},
      subtotal,
      shipping,
      tax,
      total: Number((subtotal + shipping + tax).toFixed(2)),
      status: "Pending Payment",
      paymentStatus: "Pending",
      paymentProvider: "m-pesa",
      mpesaPhone,
      timeline: [{ label: "M-Pesa payment requested", at: now }],
      createdAt: now
    };

    const stk = await initiateStkPush({ phone: mpesaPhone, amount: order.total, orderId: order.id });
    order.mpesaCheckoutRequestId = stk.CheckoutRequestID;
    order.mpesaMerchantRequestId = stk.MerchantRequestID;
    order.mpesaResponse = stk;

    const savedOrder = orders.insert(order);
    return res.status(201).json({
      order: savedOrder,
      message: "M-Pesa prompt sent. The order will be accepted after payment confirmation."
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:orderId", requireAdmin, async (req, res, next) => {
  try {
    const order = orders.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found." });

    const allowedStatuses = ["Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid order status." });
    }

    if (order.paymentStatus !== "Paid" && req.body.status !== "Cancelled") {
      return res.status(400).json({ error: "Payment must be confirmed before processing this order." });
    }

    const updatedOrder = orders.updateStatus(order.id, req.body.status);
    await sendOrderStatus(updatedOrder);
    return res.json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

async function handleMpesaCallback(req, res, next) {
  try {
    const callback = req.body.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    const updatedOrder = checkoutRequestId
      ? orders.applyMpesaCallback(checkoutRequestId, callback)
      : null;

    if (updatedOrder && updatedOrder.paymentStatus === "Paid") {
      await sendOrderStatus(updatedOrder);
    }

    return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    next(error);
  }
}

router.mpesaCallback = handleMpesaCallback;

module.exports = router;
