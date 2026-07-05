const messageLogs = require("../../repositories/message-logs");
const sms = require("./sms");
const whatsapp = require("./whatsapp");
const verify = require("./verify");
const { normalizeDigits, toE164 } = require("./phone");
const queue = require("./queue");
const { diagnosticError, isRetryableError, healthCheck: twilioHealthCheck } = require("./twilio");

const CHANNELS = {
  SMS: "sms",
  WHATSAPP: "whatsapp",
  FALLBACK: "whatsapp_sms_fallback"
};

function defaultChannel() {
  const value = String(process.env.MESSAGING_DEFAULT_CHANNEL || "whatsapp").toLowerCase();
  if (["sms", "whatsapp", "whatsapp_sms_fallback"].includes(value)) return value;
  if (value === "fallback" || value === "whatsapp_sms") return CHANNELS.FALLBACK;
  return CHANNELS.WHATSAPP;
}

function publicError(error) {
  return error?.publicMessage || error?.message || "Message could not be sent.";
}

function sentAtFor(status) {
  return ["queued", "accepted", "sending", "sent", "delivered", "read"].includes(status)
    ? new Date().toISOString()
    : null;
}

function logSendStart({ to, channel, type }) {
  return messageLogs.create({
    recipient: toE164(to) || String(to || ""),
    channel,
    type,
    provider: "twilio",
    status: "queued"
  });
}

function logSendSuccess(log, message) {
  if (!log) return null;
  const status = message?.status || "queued";
  return messageLogs.update(log.id, {
    status,
    deliveryStatus: status,
    providerSid: message?.accountSid || null,
    messageSid: message?.sid || null,
    sentAt: sentAtFor(status)
  });
}

function logSendFailure(log, error) {
  console.warn("Message provider error.", diagnosticError(error));
  if (!log) return null;
  return messageLogs.update(log.id, {
    status: "failed",
    deliveryStatus: "failed",
    error: publicError(error),
    failureReason: error?.message || publicError(error),
    failedAt: new Date().toISOString()
  });
}

async function sendViaChannel(channel, { to, message, type = "notification" }) {
  const log = logSendStart({ to, channel, type });
  if (process.env.MESSAGING_DRY_RUN === "1") {
    return {
      ok: true,
      channel,
      provider: "dry_run",
      messageSid: null,
      status: "skipped",
      retryable: false,
      log: messageLogs.update(log?.id, {
        provider: "dry_run",
        status: "skipped",
        deliveryStatus: "skipped"
      })
    };
  }
  try {
    const result = channel === CHANNELS.SMS
      ? await sms.sendSMS({ to, message })
      : await whatsapp.sendWhatsApp({ to, message });
    return {
      ok: true,
      channel,
      provider: "twilio",
      messageSid: result.sid,
      status: result.status,
      retryable: false,
      log: logSendSuccess(log, result)
    };
  } catch (error) {
    logSendFailure(log, error);
    return {
      ok: false,
      channel,
      provider: "twilio",
      error: publicError(error),
      diagnostic: diagnosticError(error),
      retryable: isRetryableError(error),
      log
    };
  }
}

async function sendWithPolicy({ to, message, type = "notification", channel = defaultChannel() }) {
  if (channel === CHANNELS.SMS) {
    return sendViaChannel(CHANNELS.SMS, { to, message, type });
  }

  if (channel === CHANNELS.WHATSAPP) {
    return sendViaChannel(CHANNELS.WHATSAPP, { to, message, type });
  }

  const whatsappResult = await sendViaChannel(CHANNELS.WHATSAPP, { to, message, type });
  if (whatsappResult.ok) return whatsappResult;

  const smsResult = await sendViaChannel(CHANNELS.SMS, { to, message, type });
  return {
    ...smsResult,
    fallbackFrom: whatsappResult
  };
}

function orderCustomerPhone(order) {
  return order?.customer?.phone || order?.shippingAddress?.phone || order?.mpesaPhone || "";
}

function orderLabel(order) {
  return order?.orderNumber || order?.id || "your order";
}

const MessagingService = {
  normalizePhone: toE164,
  normalizePhoneDigits: normalizeDigits,
  normalizePhoneE164: toE164,

  sendSMS(to, message, options = {}) {
    return sendWithPolicy({ to, message, type: options.type || "sms", channel: CHANNELS.SMS });
  },

  sendWhatsApp(to, message, options = {}) {
    return sendWithPolicy({ to, message, type: options.type || "whatsapp", channel: CHANNELS.WHATSAPP });
  },

  sendMessage({ to, message, type = "notification", channel = defaultChannel() }) {
    return sendWithPolicy({ to, message, type, channel });
  },

  enqueueMessage({ to, message, type = "notification", channel = defaultChannel() }) {
    return queue.enqueue("send_message", { to, message, type, channel });
  },

  async sendOTP({ to, channel = defaultChannel(), type = "otp" }) {
    const sendVerify = async (verifyChannel) => {
      const log = logSendStart({ to, channel: verifyChannel, type });
      try {
        const result = await verify.sendOTP({ to, channel: verifyChannel });
        return {
          ok: true,
          channel: verifyChannel,
          provider: "twilio_verify",
          status: result.status,
          sid: result.sid,
          to: result.to,
          log: logSendSuccess(log, { sid: result.sid, status: result.status || "pending" })
        };
      } catch (error) {
        logSendFailure(log, error);
        return {
          ok: false,
          channel: verifyChannel,
          provider: "twilio_verify",
        error: publicError(error),
        diagnostic: diagnosticError(error),
        retryable: isRetryableError(error),
        log
      };
      }
    };

    if (channel === CHANNELS.SMS) {
      const result = await sendVerify(CHANNELS.SMS);
      if (!result.ok) throw new Error(result.error);
      return result;
    }

    const whatsappResult = await sendVerify(CHANNELS.WHATSAPP);
    if (whatsappResult.ok) return whatsappResult;
    if (channel !== CHANNELS.FALLBACK) throw new Error(whatsappResult.error);

    const smsResult = await sendVerify(CHANNELS.SMS);
    if (!smsResult.ok) throw new Error(smsResult.error);
    return { ...smsResult, fallbackFrom: whatsappResult };
  },

  async verifyOTP({ to, code, type = "otp_check" }) {
    const log = logSendStart({ to, channel: "verify", type });
    try {
      const result = await verify.verifyOTP({ to, code });
      const approved = result.status === "approved";
      messageLogs.update(log.id, {
        status: approved ? "approved" : result.status || "failed",
        deliveryStatus: approved ? "approved" : result.status || "failed",
        messageSid: result.sid || null,
        deliveredAt: approved ? new Date().toISOString() : null
      });
      return { approved, status: result.status, sid: result.sid };
    } catch (error) {
      logSendFailure(log, error);
      throw new Error(publicError(error));
    }
  },

  sendOrderConfirmation(order, options = {}) {
    const to = orderCustomerPhone(order);
    const message = `OMANUTRO order ${orderLabel(order)} has been created. Total: ${order.currency || "KES"} ${order.total}.`;
    return this.enqueueMessage({ to, message, type: "order_confirmation", channel: options.channel });
  },

  sendPaymentConfirmation(order, options = {}) {
    const to = orderCustomerPhone(order);
    const message = `Payment confirmed for OMANUTRO order ${orderLabel(order)}. We are preparing your order.`;
    return this.enqueueMessage({ to, message, type: "payment_confirmation", channel: options.channel });
  },

  sendShippingUpdate(order, options = {}) {
    const to = orderCustomerPhone(order);
    const message = `OMANUTRO order ${orderLabel(order)} is now ${order.status}.`;
    return this.enqueueMessage({ to, message, type: "shipping_update", channel: options.channel });
  },

  sendDeliveryUpdate(order, options = {}) {
    const to = orderCustomerPhone(order);
    const message = `OMANUTRO order ${orderLabel(order)} has been delivered. Thank you for shopping with us.`;
    return this.enqueueMessage({ to, message, type: "delivery_update", channel: options.channel });
  },

  updateDeliveryStatus(callbackBody = {}) {
    const messageSid = callbackBody.MessageSid || callbackBody.SmsSid || callbackBody.SmsMessageSid;
    const status = callbackBody.MessageStatus || callbackBody.SmsStatus || callbackBody.MessageStatusCallbackEvent;
    if (!messageSid || !status) return null;

    const normalizedStatus = String(status).toLowerCase();
    const patch = {
      status: normalizedStatus,
      deliveryStatus: normalizedStatus,
      error: callbackBody.ErrorMessage || callbackBody.ErrorCode || null,
      failureReason: callbackBody.ErrorMessage || callbackBody.ErrorCode || null,
      deliveryCost: callbackBody.Price ? Number(callbackBody.Price) : null
    };

    if (["sent", "delivered", "read"].includes(normalizedStatus)) {
      patch.sentAt = new Date().toISOString();
    }
    if (["delivered", "read"].includes(normalizedStatus)) {
      patch.deliveredAt = new Date().toISOString();
    }
    if (["failed", "undelivered"].includes(normalizedStatus)) {
      patch.failedAt = new Date().toISOString();
    }

    return messageLogs.updateByMessageSid(messageSid, patch);
  },

  health() {
    return twilioHealthCheck().then((twilio) => ({
      ok: twilio.ok && queue.health().ready,
      provider: "twilio",
      queue: queue.health(),
      twilio
    }));
  },

  messageLogs
};

queue.registerProcessor(async (job) => {
  if (job.jobName !== "send_message") return null;
  const result = await sendWithPolicy(job);
  if (!result.ok && result.retryable) {
    if (result.log?.id) messageLogs.incrementRetry(result.log.id);
    const error = new Error(result.error);
    error.retryable = true;
    throw error;
  }
  if (!result.ok) {
    return result;
  }
  return result;
});

module.exports = MessagingService;
