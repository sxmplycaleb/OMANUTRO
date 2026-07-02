const crypto = require("crypto");
const orders = require("../repositories/orders");
const products = require("../repositories/products");
const carts = require("../repositories/carts");
const { publicUser } = require("../services/store");
const { initiateStkPush } = require("../services/mpesa");
const { normalizePhone, sendOrderStatus } = require("../services/whatsapp");
const { badRequest, notFound } = require("../http/errors");

function buildOrderItems(requestedItems) {
  const orderItems = [];

  for (const item of requestedItems) {
    const quantity = Number(item.quantity || 0);
    const product = products.findById(item.productId);

    if (!product || quantity < 1) {
      throw badRequest("Your cart contains an unavailable product.");
    }

    if (product.stock < quantity) {
      throw badRequest(`${product.name} does not have enough stock.`);
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      options: item.options || {},
      subtotal: Number((product.price * quantity).toFixed(2))
    });
  }

  return orderItems;
}

function orderNumber() {
  return `OMN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function validateShippingAddress(shippingAddress = {}) {
  const name = String(shippingAddress.name || "").trim();
  const address = String(shippingAddress.address || "").trim();
  const city = String(shippingAddress.city || "").trim();

  if (!name || !address || !city) {
    throw badRequest("Enter your shipping name, address, and city.");
  }

  return { ...shippingAddress, name, address, city };
}

function checkoutAttemptId(body) {
  const value = String(body.checkoutAttemptId || body.idempotencyKey || "").trim();
  return value.length <= 128 ? value : "";
}

function listOrders(user) {
  const permissions = user.permissions || [];
  const canViewAll = permissions.includes("*") || permissions.includes("orders:manage") || permissions.includes("orders:view");
  return canViewAll
    ? orders.all()
    : orders.forUser(user.id);
}

async function createOrder(user, body) {
  if (!user?.id) throw badRequest("Sign in before checkout.");

  const attemptId = checkoutAttemptId(body);
  const existingOrder = orders.findByCheckoutAttempt(user.id, attemptId);
  if (existingOrder) return existingOrder;

  const requestedItems = Array.isArray(body.items) ? body.items : [];
  if (!requestedItems.length) throw badRequest("Add products to your cart first.");

  if (body.paymentMethod !== "m-pesa") {
    throw badRequest("Only confirmed M-Pesa checkout is enabled. Add Stripe/PayPal credentials before accepting card or PayPal orders.");
  }

  const mpesaPhone = normalizePhone(body.mpesaPhone || user.phone);
  if (!mpesaPhone) throw badRequest("Enter the M-Pesa phone number.");
  if (mpesaPhone.length < 10 || mpesaPhone.length > 15) throw badRequest("Enter a valid M-Pesa phone number.");

  const orderItems = buildOrderItems(requestedItems);
  const subtotal = Number(orderItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const shipping = subtotal >= 100 ? 0 : 12;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  const now = new Date().toISOString();
  const number = orderNumber();
  const order = {
    id: `ord_${crypto.randomBytes(8).toString("hex")}`,
    orderNumber: number,
    checkoutAttemptId: attemptId || null,
    userId: user.id,
    customer: publicUser(user),
    items: orderItems,
    shippingAddress: validateShippingAddress(body.shippingAddress || {}),
    subtotal,
    shipping,
    tax,
    total,
    currency: "KES",
    status: "Pending Payment",
    paymentStatus: "Pending",
    paymentProvider: "m-pesa",
    mpesaPhone,
    mpesaAmount: total,
    mpesaTransactionReference: number,
    timeline: [{ label: "M-Pesa payment requested", at: now }],
    createdAt: now
  };

  const createdOrder = orders.insert(order);

  try {
    const stk = await initiateStkPush({
      phone: mpesaPhone,
      amount: order.total,
      orderId: order.id,
      transactionReference: order.mpesaTransactionReference
    });

    return orders.updateMpesaRequest(createdOrder.id, stk);
  } catch (error) {
    orders.markPaymentInitiationFailed(createdOrder.id, error.message);
    throw badRequest(error.message || "M-Pesa payment could not be initiated.");
  }
}

async function updateStatus(orderId, status) {
  const order = orders.findById(orderId);
  if (!order) throw notFound("Order not found.");

  const allowedStatuses = ["Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
  if (!allowedStatuses.includes(status)) {
    throw badRequest("Invalid order status.");
  }

  if (order.paymentStatus !== "Paid" && status !== "Cancelled") {
    throw badRequest("Payment must be confirmed before processing this order.");
  }

  const updatedOrder = orders.updateStatus(order.id, status);
  await sendOrderStatus(updatedOrder);
  return updatedOrder;
}

async function applyMpesaCallback(body) {
  const callback = body.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  const previousOrder = checkoutRequestId
    ? orders.findByMpesaCheckoutRequestId(checkoutRequestId)
    : null;
  const updatedOrder = checkoutRequestId
    ? orders.applyMpesaCallback(checkoutRequestId, callback)
    : null;

  if (updatedOrder && updatedOrder.paymentStatus === "Paid" && previousOrder?.paymentStatus !== "Paid") {
    carts.clearForUser(updatedOrder.userId);
    await sendOrderStatus(updatedOrder);
  }

  return { ResultCode: 0, ResultDesc: "Accepted" };
}

module.exports = {
  listOrders,
  createOrder,
  updateStatus,
  applyMpesaCallback
};
