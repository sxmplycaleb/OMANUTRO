const { getClient, publicError, verifyServiceSid } = require("./twilio");
const { assertE164 } = require("./phone");

function verifyEnabled() {
  return process.env.ENABLE_VERIFY !== "false";
}

function serviceSid() {
  const sid = verifyServiceSid();
  if (!sid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured.");
  }
  return sid;
}

function verifyChannel(channel) {
  return channel === "sms" ? "sms" : "whatsapp";
}

async function sendOTP({ to, channel = "whatsapp" }) {
  if (!verifyEnabled()) throw new Error("Twilio Verify is disabled.");
  const recipient = assertE164(to);

  try {
    return await getClient()
      .verify.v2.services(serviceSid())
      .verifications
      .create({ to: recipient, channel: verifyChannel(channel) });
  } catch (error) {
    error.publicMessage = publicError(error);
    throw error;
  }
}

async function verifyOTP({ to, code }) {
  if (!verifyEnabled()) throw new Error("Twilio Verify is disabled.");
  const recipient = assertE164(to);
  const otp = String(code || "").trim();
  if (!recipient) throw new Error("Invalid recipient phone number.");
  if (!otp) throw new Error("Verification code is required.");

  try {
    return await getClient()
      .verify.v2.services(serviceSid())
      .verificationChecks
      .create({ to: recipient, code: otp });
  } catch (error) {
    error.publicMessage = publicError(error);
    throw error;
  }
}

module.exports = {
  sendOTP,
  verifyOTP
};
