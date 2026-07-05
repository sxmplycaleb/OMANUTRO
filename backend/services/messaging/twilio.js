const twilio = require("twilio");
const config = require("../../config");

let client = null;

function providerEnabled() {
  return (process.env.MESSAGING_PROVIDER || "twilio").toLowerCase() === "twilio";
}

function credentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  return {
    accountSid,
    username: apiKeySid && apiKeySecret ? apiKeySid : accountSid,
    password: apiKeySid && apiKeySecret ? apiKeySecret : authToken
  };
}

function verifyServiceSid() {
  return process.env.TWILIO_VERIFY_SERVICE_SID || process.env.VERIFY_SERVICE_SID || "";
}

function smsSender() {
  return process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID || "";
}

function whatsappSender() {
  return process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || "";
}

function requiredConfigErrors() {
  if (!providerEnabled()) return [];
  const { accountSid, username, password } = credentials();
  const errors = [];
  if (!accountSid) errors.push("TWILIO_ACCOUNT_SID is required.");
  if (!username || !password) errors.push("Set TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET, or TWILIO_AUTH_TOKEN.");
  if (process.env.ENABLE_VERIFY !== "false" && !verifyServiceSid()) {
    errors.push("TWILIO_VERIFY_SERVICE_SID or VERIFY_SERVICE_SID is required.");
  }
  if (process.env.ENABLE_SMS !== "false" && !smsSender()) {
    errors.push("TWILIO_SMS_FROM, TWILIO_PHONE_NUMBER, or TWILIO_MESSAGING_SERVICE_SID is required for SMS.");
  }
  if (process.env.ENABLE_WHATSAPP !== "false" && !whatsappSender()) {
    errors.push("TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_NUMBER is required for WhatsApp.");
  }
  if (process.env.NODE_ENV === "production" && process.env.TWILIO_VALIDATE_STATUS_CALLBACK === "false") {
    errors.push("TWILIO_VALIDATE_STATUS_CALLBACK must not be false in production.");
  }
  return errors;
}

function validateStartupConfig({ strict = process.env.NODE_ENV === "production" || process.env.MESSAGING_REQUIRE_CONFIG === "true" } = {}) {
  const errors = requiredConfigErrors();
  if (strict && errors.length) {
    throw new Error(`Messaging configuration is invalid: ${errors.join(" ")}`);
  }
  return { ok: errors.length === 0, errors };
}

function getClient() {
  if (!providerEnabled()) {
    throw new Error("Messaging provider is not enabled.");
  }

  if (client) return client;

  const { accountSid, username, password } = credentials();
  if (!accountSid || !username || !password) {
    throw new Error("Twilio credentials are not configured.");
  }

  client = twilio(username, password, { accountSid });
  return client;
}

function statusCallbackUrl() {
  if (process.env.TWILIO_STATUS_CALLBACK) return process.env.TWILIO_STATUS_CALLBACK;
  if (!config.appUrl) return "";
  return `${String(config.appUrl).replace(/\/$/, "")}/api/messaging/twilio/status`;
}

function validateStatusCallback({ signature, params, url }) {
  if (process.env.TWILIO_VALIDATE_STATUS_CALLBACK === "false") return true;
  if (!process.env.TWILIO_AUTH_TOKEN) return false;
  if (!signature) return false;
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url || statusCallbackUrl(), params || {});
}

function publicError(error) {
  if (error?.code === "INVALID_PHONE_NUMBER" || error?.code === 21211 || error?.code === 21614) {
    return "Enter a valid phone number.";
  }
  if (error?.code === "RATE_LIMITED") {
    return "Too many attempts. Please wait before trying again.";
  }
  return "Messaging is temporarily unavailable. Please try again shortly.";
}

function diagnosticError(error) {
  return {
    name: error?.name,
    code: error?.code,
    status: error?.status,
    message: error?.message
  };
}

function isRetryableError(error) {
  if (!error) return false;
  if (error.code === "INVALID_PHONE_NUMBER") return false;
  if ([21211, 21606, 21614, 20003].includes(Number(error.code))) return false;
  if (error.status === 429 || Number(error.code) === 20429) return true;
  if (Number(error.status) >= 500) return true;
  return ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(String(error.code || ""));
}

async function healthCheck() {
  const configStatus = validateStartupConfig({ strict: false });
  const checks = {
    provider: providerEnabled(),
    configuration: configStatus,
    credentialsLoaded: Boolean(credentials().accountSid && credentials().password),
    verifyServiceConfigured: Boolean(verifyServiceSid()),
    apiAuthentication: false,
    verifyServiceReachable: false
  };

  if (!configStatus.ok) {
    return { ok: false, checks };
  }

  try {
    const client = getClient();
    await client.api.accounts(credentials().accountSid).fetch();
    checks.apiAuthentication = true;
    if (verifyServiceSid()) {
      await client.verify.v2.services(verifyServiceSid()).fetch();
      checks.verifyServiceReachable = true;
    }
  } catch (error) {
    checks.error = diagnosticError(error);
  }

  return {
    ok: checks.apiAuthentication && (process.env.ENABLE_VERIFY === "false" || checks.verifyServiceReachable),
    checks
  };
}

module.exports = {
  getClient,
  statusCallbackUrl,
  validateStatusCallback,
  validateStartupConfig,
  requiredConfigErrors,
  publicError,
  diagnosticError,
  isRetryableError,
  healthCheck,
  smsSender,
  whatsappSender,
  verifyServiceSid
};
