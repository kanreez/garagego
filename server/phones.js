// Phone numbers: every account has one so a renter can call the host. It lives in the Supabase
// user's app_metadata (only the server can write that), so no table change is needed.
//   app_metadata.phone          "+359881234567"
//   app_metadata.phone_public   true: anyone who opens the host's garage sees it
//                               false: only renters who have paid for one of its bookings

const PHONE_INVALID = "Enter a valid phone number, e.g. +359 88 123 4567";

// "088 123 4567", "+359 88-123-4567", "00359..." -> "+359881234567"; null if it isn't a number
function normalizePhone(value) {
  let s = String(value ?? "").trim().replace(/[\s\-().\/]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (/^0\d{8,9}$/.test(s)) s = "+359" + s.slice(1); // a Bulgarian number written locally
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

// What the app may know about a user's own phone
function phoneOf(user) {
  const m = user?.app_metadata ?? {};
  return m.phone ? { number: m.phone, public: m.phone_public !== false } : null;
}

// Body { phone, public } -> { metadata } to save, or { error } to answer with a 400
function phoneMetadata(body) {
  const number = normalizePhone(body?.phone);
  if (!number) return { error: PHONE_INVALID };
  return { metadata: { phone: number, phone_public: body?.public !== false } };
}

module.exports = { normalizePhone, phoneOf, phoneMetadata, PHONE_INVALID };
