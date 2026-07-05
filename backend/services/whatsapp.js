const MessagingService = require("./messaging");

function normalizePhone(phone) {
  return MessagingService.normalizePhone(phone);
}

function normalizePhoneDigits(phone) {
  return MessagingService.normalizePhoneDigits(phone);
}

async function sendWhatsAppMessage({ to, message, context = {} }) {
  return MessagingService.sendWhatsApp(to, message, { type: context.type || "whatsapp" });
}

async function sendSignupCode(phone) {
  return MessagingService.sendOTP({ to: phone, type: "signup_otp" });
}

async function sendResetCode(user) {
  return MessagingService.sendOTP({ to: user.phone, type: "password_reset_otp" });
}

function sendOrderStatus(order) {
  if (order.status === "Delivered") return MessagingService.sendDeliveryUpdate(order);
  return MessagingService.sendShippingUpdate(order);
}

module.exports = {
  normalizePhone,
  normalizePhoneDigits,
  sendWhatsAppMessage,
  sendSignupCode,
  sendResetCode,
  sendOrderStatus
};
