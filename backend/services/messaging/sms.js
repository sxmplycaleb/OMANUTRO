const { getClient, statusCallbackUrl, publicError, smsSender } = require("./twilio");
const { assertE164 } = require("./phone");

function smsEnabled() {
  return process.env.ENABLE_SMS !== "false";
}

async function sendSMS({ to, message }) {
  if (!smsEnabled()) throw new Error("SMS messaging is disabled.");
  const recipient = assertE164(to);
  const from = smsSender();
  if (!from) throw new Error("TWILIO_SMS_FROM is not configured.");

  try {
    const payload = {
      to: recipient,
      body: message,
      statusCallback: statusCallbackUrl()
    };
    if (from.startsWith("MG")) payload.messagingServiceSid = from;
    else payload.from = from;
    return await getClient().messages.create({
      ...payload
    });
  } catch (error) {
    error.publicMessage = publicError(error);
    throw error;
  }
}

module.exports = {
  sendSMS
};
