const { parsePhoneNumberFromString } = require("libphonenumber-js");

function normalizeDigits(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function toE164(phone, defaultCountryCode = "254") {
  let raw = String(phone || "").trim();
  if (!raw) return "";
  if (raw.startsWith("whatsapp:")) raw = raw.slice("whatsapp:".length);
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`;

  const digits = normalizeDigits(raw);
  const region = defaultCountryCode === "254" ? "KE" : undefined;
  const candidate = raw.startsWith("+")
    ? raw
    : digits.startsWith(defaultCountryCode)
      ? `+${digits}`
      : raw.startsWith("0")
        ? raw
        : `+${defaultCountryCode}${digits}`;
  const phoneNumber = parsePhoneNumberFromString(candidate, region);
  return phoneNumber?.isValid() ? phoneNumber.number : "";
}

function assertE164(phone, label = "phone number") {
  const e164 = toE164(phone);
  if (!e164) {
    const error = new Error(`Invalid ${label}.`);
    error.code = "INVALID_PHONE_NUMBER";
    error.publicMessage = "Enter a valid phone number.";
    throw error;
  }
  return e164;
}

function toWhatsAppAddress(phone) {
  const e164 = String(phone || "").startsWith("whatsapp:")
    ? String(phone).slice("whatsapp:".length)
    : toE164(phone);
  return e164 ? `whatsapp:${e164}` : "";
}

module.exports = {
  normalizeDigits,
  toE164,
  assertE164,
  toWhatsAppAddress
};
