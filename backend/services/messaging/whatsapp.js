const { getClient, statusCallbackUrl, publicError } = require("./twilio");
const { assertE164, toWhatsAppAddress } = require("./phone");

function whatsappEnabled() {
  return process.env.ENABLE_WHATSAPP !== "false";
}

function whatsappSender() {
  const sender = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || "";
  return sender.startsWith("whatsapp:") ? sender : toWhatsAppAddress(sender);
}

async function sendWhatsApp({ to, message }) {
  if (!whatsappEnabled()) throw new Error("WhatsApp messaging is disabled.");
  const recipient = `whatsapp:${assertE164(to, "WhatsApp number")}`;
  const from = whatsappSender();
  if (!from) throw new Error("TWILIO_WHATSAPP_FROM is not configured.");

  try {
    return await getClient().messages.create({
      to: recipient,
      from,
      body: message,
      statusCallback: statusCallbackUrl()
    });
  } catch (error) {
    error.publicMessage = publicError(error);
    throw error;
  }
}

module.exports = {
  sendWhatsApp
};
