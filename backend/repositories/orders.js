const { db, json, parseJson } = require("./database");

function toOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    customer: parseJson(row.customer_json, {}),
    items: parseJson(row.items_json, []),
    shippingAddress: parseJson(row.shipping_address_json, {}),
    subtotal: row.subtotal,
    shipping: row.shipping,
    tax: row.tax,
    total: row.total,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentProvider: row.payment_provider,
    mpesaPhone: row.mpesa_phone,
    mpesaCheckoutRequestId: row.mpesa_checkout_request_id,
    mpesaMerchantRequestId: row.mpesa_merchant_request_id,
    mpesaResponse: parseJson(row.mpesa_response_json, null),
    mpesaResult: parseJson(row.mpesa_result_json, null),
    timeline: parseJson(row.timeline_json, []),
    stockReducedAt: row.stock_reduced_at,
    createdAt: row.created_at
  };
}

function insert(order) {
  db.prepare(`
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
  `).run({
    ...order,
    customerJson: json(order.customer || {}, {}),
    itemsJson: json(order.items || [], []),
    shippingAddressJson: json(order.shippingAddress || {}, {}),
    mpesaResponseJson: json(order.mpesaResponse),
    mpesaResultJson: json(order.mpesaResult),
    timelineJson: json(order.timeline || [], []),
    stockReducedAt: order.stockReducedAt || null
  });
  return findById(order.id);
}

function all() {
  return db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all().map(toOrder);
}

function forUser(userId) {
  return db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(userId).map(toOrder);
}

function findById(id) {
  return toOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id));
}

function findByMpesaCheckoutRequestId(checkoutRequestId) {
  return toOrder(db.prepare("SELECT * FROM orders WHERE mpesa_checkout_request_id = ?").get(checkoutRequestId));
}

function updateStatus(orderId, status) {
  const order = findById(orderId);
  if (!order) return null;
  const timeline = [...(order.timeline || []), { label: status, at: new Date().toISOString() }];
  db.prepare("UPDATE orders SET status = ?, timeline_json = ? WHERE id = ?").run(status, json(timeline, []), orderId);
  return findById(orderId);
}

function applyMpesaCallback(checkoutRequestId, callback) {
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM orders WHERE mpesa_checkout_request_id = ?").get(checkoutRequestId);
    const order = toOrder(row);
    if (!order) return null;

    const now = new Date().toISOString();
    const timeline = [...(order.timeline || [])];
    let status = order.status;
    let paymentStatus = order.paymentStatus;
    let stockReducedAt = order.stockReducedAt;

    if (callback?.ResultCode === 0) {
      paymentStatus = "Paid";
      if (!stockReducedAt) {
        for (const item of order.items || []) {
          const product = db.prepare("SELECT id, stock FROM products WHERE id = ?").get(item.productId);
          if (!product || product.stock < item.quantity) {
            status = "Payment Confirmed - Stock Issue";
            timeline.push({ label: `${item.name} is no longer available in the requested quantity.`, at: now });
            db.prepare(`
              UPDATE orders
              SET status = ?, payment_status = ?, mpesa_result_json = ?, timeline_json = ?
              WHERE id = ?
            `).run(status, paymentStatus, json(callback), json(timeline, []), order.id);
            return findById(order.id);
          }
        }

        for (const item of order.items || []) {
          db.prepare(`
            UPDATE products
            SET stock = stock - ?, updated_at = ?
            WHERE id = ?
          `).run(item.quantity, now, item.productId);
        }
        stockReducedAt = now;
      }
      status = "Processing";
      timeline.push({ label: "M-Pesa payment confirmed", at: now });
    } else {
      paymentStatus = "Failed";
      status = "Payment Failed";
      timeline.push({ label: "M-Pesa payment failed", at: now });
    }

    db.prepare(`
      UPDATE orders
      SET status = ?,
          payment_status = ?,
          mpesa_result_json = ?,
          timeline_json = ?,
          stock_reduced_at = ?
      WHERE id = ?
    `).run(status, paymentStatus, json(callback), json(timeline, []), stockReducedAt, order.id);

    return findById(order.id);
  })();
}

module.exports = {
  insert,
  all,
  forUser,
  findById,
  findByMpesaCheckoutRequestId,
  updateStatus,
  applyMpesaCallback
};
