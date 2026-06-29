const crypto = require("crypto");
const orders = require("../repositories/orders");
const products = require("../repositories/products");
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
      subtotal: Number((product.price * quantity).toFixed(2))
    });
  }

  return orderItems;
}

function listOrders(user) {
  return user.role === "admin"
    ? orders.all()
    : orders.forUser(user.id);
}

async function createOrder(user, body) {
  const requestedItems = Array.isArray(body.items) ? body.items : [];
  if (!requestedItems.length) throw badRequest("Add products to your cart first.");

  if (body.paymentMethod !== "m-pesa") {
    throw badRequest("Only confirmed M-Pesa checkout is enabled. Add Stripe/PayPal credentials before accepting card or PayPal orders.");
  }

  const mpesaPhone = normalizePhone(body.mpesaPhone || user.phone);
  if (!mpesaPhone) throw badRequest("Enter the M-Pesa phone number.");

  const orderItems = buildOrderItems(requestedItems);
  const subtotal = Number(orderItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const shipping = subtotal >= 100 ? 0 : 12;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const now = new Date().toISOString();
  const order = {
    id: `ord_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    customer: publicUser(user),
    items: orderItems,
    shippingAddress: body.shippingAddress || {},
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

  return orders.insert(order);
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
  const updatedOrder = checkoutRequestId
    ? orders.applyMpesaCallback(checkoutRequestId, callback)
    : null;

  if (updatedOrder && updatedOrder.paymentStatus === "Paid") {
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
