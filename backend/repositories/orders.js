const { db, json, parseJson } = require("./database");

function toOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    checkoutAttemptId: row.checkout_attempt_id,
    userId: row.user_id,
    customer: parseJson(row.customer_json, {}),
    items: parseJson(row.items_json, []),
    shippingAddress: parseJson(row.shipping_address_json, {}),
    subtotal: row.subtotal,
    shipping: row.shipping,
    tax: row.tax,
    total: row.total,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentProvider: row.payment_provider,
    mpesaPhone: row.mpesa_phone,
    mpesaCheckoutRequestId: row.mpesa_checkout_request_id,
    mpesaMerchantRequestId: row.mpesa_merchant_request_id,
    mpesaTransactionReference: row.mpesa_transaction_reference,
    mpesaAmount: row.mpesa_amount,
    mpesaReceiptNumber: row.mpesa_receipt_number,
    mpesaTransactionDate: row.mpesa_transaction_date,
    mpesaCallbackReceivedAt: row.mpesa_callback_received_at,
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
  `).run({
    ...order,
    orderNumber: order.orderNumber || null,
    checkoutAttemptId: order.checkoutAttemptId || null,
    customerJson: json(order.customer || {}, {}),
    itemsJson: json(order.items || [], []),
    shippingAddressJson: json(order.shippingAddress || {}, {}),
    currency: order.currency || "KES",
    mpesaCheckoutRequestId: order.mpesaCheckoutRequestId || null,
    mpesaMerchantRequestId: order.mpesaMerchantRequestId || null,
    mpesaTransactionReference: order.mpesaTransactionReference || null,
    mpesaAmount: order.mpesaAmount || order.total || null,
    mpesaReceiptNumber: order.mpesaReceiptNumber || null,
    mpesaTransactionDate: order.mpesaTransactionDate || null,
    mpesaCallbackReceivedAt: order.mpesaCallbackReceivedAt || null,
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

function findByCheckoutAttempt(userId, checkoutAttemptId) {
  if (!checkoutAttemptId) return null;
  return toOrder(db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ? AND checkout_attempt_id = ?
    LIMIT 1
  `).get(userId, checkoutAttemptId));
}

function findByMpesaCheckoutRequestId(checkoutRequestId) {
  return toOrder(db.prepare("SELECT * FROM orders WHERE mpesa_checkout_request_id = ?").get(checkoutRequestId));
}

function updateMpesaRequest(orderId, stk) {
  db.prepare(`
    UPDATE orders
    SET mpesa_checkout_request_id = ?,
        mpesa_merchant_request_id = ?,
        mpesa_response_json = ?,
        payment_status = 'Pending',
        status = 'Pending Payment'
    WHERE id = ?
  `).run(stk.CheckoutRequestID || null, stk.MerchantRequestID || null, json(stk), orderId);
  return findById(orderId);
}

function markPaymentInitiationFailed(orderId, errorMessage) {
  const order = findById(orderId);
  if (!order) return null;
  const now = new Date().toISOString();
  const timeline = [...(order.timeline || []), { label: errorMessage || "M-Pesa payment initiation failed", at: now }];
  db.prepare(`
    UPDATE orders
    SET status = 'Payment Initiation Failed',
        payment_status = 'Failed',
        timeline_json = ?
    WHERE id = ?
  `).run(json(timeline, []), orderId);
  return findById(orderId);
}

function callbackValue(callback, name) {
  const item = callback?.CallbackMetadata?.Item?.find((entry) => entry.Name === name);
  return item?.Value ?? null;
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
    if (callback?.MerchantRequestID && order.mpesaMerchantRequestId && callback.MerchantRequestID !== order.mpesaMerchantRequestId) {
      return null;
    }

    const now = new Date().toISOString();
    const timeline = [...(order.timeline || [])];
    let status = order.status;
    let paymentStatus = order.paymentStatus;
    let stockReducedAt = order.stockReducedAt;
    const resultCode = Number(callback?.ResultCode);
    const mpesaAmount = callbackValue(callback, "Amount");
    const mpesaReceiptNumber = callbackValue(callback, "MpesaReceiptNumber");
    const mpesaTransactionDate = callbackValue(callback, "TransactionDate");

    if (resultCode === 0 && mpesaAmount !== null && Math.round(Number(mpesaAmount)) !== Math.round(Number(order.total))) {
      paymentStatus = "Failed";
      status = "Payment Amount Mismatch";
      timeline.push({ label: "M-Pesa amount did not match the order total.", at: now });
    } else if (resultCode === 0) {
      paymentStatus = "Paid";
      if (!stockReducedAt) {
        for (const item of order.items || []) {
          const product = db.prepare("SELECT id, stock FROM products WHERE id = ?").get(item.productId);
          if (!product || product.stock < item.quantity) {
            status = "Payment Confirmed - Stock Issue";
            timeline.push({ label: `${item.name} is no longer available in the requested quantity.`, at: now });
            db.prepare(`
              UPDATE orders
              SET status = ?,
                  payment_status = ?,
                  mpesa_amount = ?,
                  mpesa_receipt_number = ?,
                  mpesa_transaction_date = ?,
                  mpesa_callback_received_at = ?,
                  mpesa_result_json = ?,
                  timeline_json = ?
              WHERE id = ?
            `).run(status, paymentStatus, mpesaAmount || order.mpesaAmount, mpesaReceiptNumber, mpesaTransactionDate, now, json(callback), json(timeline, []), order.id);
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
      if (order.paymentStatus !== "Paid") timeline.push({ label: "M-Pesa payment confirmed", at: now });
    } else {
      paymentStatus = "Failed";
      status = "Payment Failed";
      if (order.paymentStatus !== "Failed") timeline.push({ label: callback?.ResultDesc || "M-Pesa payment failed", at: now });
    }

    db.prepare(`
      UPDATE orders
      SET status = ?,
          payment_status = ?,
          mpesa_amount = ?,
          mpesa_receipt_number = ?,
          mpesa_transaction_date = ?,
          mpesa_callback_received_at = ?,
          mpesa_result_json = ?,
          timeline_json = ?,
          stock_reduced_at = ?
      WHERE id = ?
    `).run(
      status,
      paymentStatus,
      mpesaAmount || order.mpesaAmount,
      mpesaReceiptNumber || order.mpesaReceiptNumber,
      mpesaTransactionDate || order.mpesaTransactionDate,
      now,
      json(callback),
      json(timeline, []),
      stockReducedAt,
      order.id
    );

    return findById(order.id);
  })();
}

module.exports = {
  insert,
  all,
  forUser,
  findById,
  findByCheckoutAttempt,
  findByMpesaCheckoutRequestId,
  updateMpesaRequest,
  markPaymentInitiationFailed,
  updateStatus,
  applyMpesaCallback
};
