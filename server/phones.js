const PHONE_INVALID = "Enter a valid phone number, e.g. +359 88 123 4567";

function normalizePhone(value) {
  let s = String(value ?? "").trim().replace(/[\s\-().\/]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (/^0\d{8,9}$/.test(s)) s = "+359" + s.slice(1);
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

function phoneOf(user) {
  const m = user?.app_metadata ?? {};
  return m.phone ? { number: m.phone, public: m.phone_public !== false } : null;
}

function phoneMetadata(body) {
  const number = normalizePhone(body?.phone);
  if (!number) return { error: PHONE_INVALID };
  return { metadata: { phone: number, phone_public: body?.public !== false } };
}

module.exports = { phoneOf, phoneMetadata };
