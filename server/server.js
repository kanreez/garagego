const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { askAnthropic } = require("./anthropic");
const G = require("./garages");
const { createRepo } = require("./repo");
const U = require("./usernames");
const P = require("./phones");
const A = require("./admin");
const geo = require("./geocode");
const photos = require("./photos");
const { createPaymentProvider, PaymentError } = require("./payments/provider");
const { computePrice } = require("./payments/pricing");

const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")}. Copy server/.env.example to server/.env and fill it in.`);
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.warn("No AI key set: add ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY to server/.env for /api/ai.");
}

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const repo = createRepo(supabase);
const usernames = U.createUsernames(supabase);

const authClient = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const payments = createPaymentProvider(repo);
const photoStore = photos.createPhotoStore(supabase);

const PHOTO_PATH = "/api/uploads/garage-photo";
const jsonBody = express.json();
const photoBody = express.json({ limit: "8mb" });

app.use(cors());
app.use((req, res, next) => (req.path === PHOTO_PATH ? next() : jsonBody(req, res, next)));
app.use("/uploads", express.static(photos.UPLOADS_DIR, { index: false, maxAge: "365d", setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff") }));

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid token" });
  if (A.isBlocked(data.user)) return res.status(403).json({ error: "This account is blocked" });

  req.user = data.user;
  next();
}

async function requireDevice(req, res, next) {
  try {
    const garage = await repo.getGarageByDeviceKey(req.headers["x-device-key"]);
    if (!garage) return res.status(401).json({ error: "Unknown device key" });
    req.garage = garage;
    deviceLastSeen.set(garage.id, new Date().toISOString());
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const safeMessage = (m) => (typeof m === "string" && m.length <= 160 && !/[<>]/.test(m) ? m : "Something went wrong. Please try again.");
const route = (fn) => (req, res) =>
  fn(req, res).catch((err) => res.status(err instanceof PaymentError ? err.status : 500).json({ error: err instanceof PaymentError ? err.message : safeMessage(err.message) }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
if (!fs.existsSync(path.join(__dirname, "..", "dist", "index.html"))) app.get("/", (_req, res) => res.json({ status: "ok" }));

app.get("/api/me", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: { id: req.user.id, email: req.user.email }, profile: data, phone: P.phoneOf(req.user), is_admin: A.isAdmin(req.user) });
});

app.put("/api/me/phone", requireAuth, route(async (req, res) => {
  const { metadata, error } = P.phoneMetadata(req.body);
  if (error) return res.status(400).json({ error });
  const { error: e } = await supabase.auth.admin.updateUserById(req.user.id, { app_metadata: { ...req.user.app_metadata, ...metadata } });
  if (e) throw new Error(e.message);
  hostUsers.delete(req.user.id);
  res.json({ phone: { number: metadata.phone, public: metadata.phone_public } });
}));

const HOST_CACHE_MS = 60000;
const hostUsers = new Map();
async function hostUser(id) {
  const hit = hostUsers.get(id);
  if (hit && Date.now() - hit.at < HOST_CACHE_MS) return hit.user;
  const { data } = await supabase.auth.admin.getUserById(id).catch(() => ({ data: null }));
  const user = data?.user ?? null;
  hostUsers.set(id, { user, at: Date.now() });
  return user;
}

async function hostPhoneFor(garage, viewerId, paidHere) {
  const phone = P.phoneOf(await hostUser(garage.host_id));
  if (!phone) return null;
  if (phone.public || garage.host_id === viewerId || paidHere) return phone;
  return { number: null, public: false, hidden: true };
}

const sessionTokens = (session) => ({ access_token: session.access_token, refresh_token: session.refresh_token });

const LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 10 * 60000;
const loginTries = new Map();
function tooManyTries(key) {
  const now = Date.now();
  const recent = (loginTries.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  recent.push(now);
  loginTries.set(key, recent);
  return recent.length > LOGIN_ATTEMPTS;
}

const BAD_LOGIN = "Wrong username, email or password";
app.post("/api/auth/login", route(async (req, res) => {
  const identifier = String(req.body?.identifier ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!identifier || !password) return res.status(400).json({ error: "Enter your username or email and your password" });
  if (tooManyTries(`${req.ip}|${identifier.toLowerCase()}`)) {
    return res.status(429).json({ error: "Too many tries. Wait a few minutes and try again." });
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    const id = await usernames.idFor(U.transliterate(identifier));
    const user = id ? (await supabase.auth.admin.getUserById(id)).data?.user : null;
    if (!user?.email) return res.status(401).json({ error: BAD_LOGIN });
    email = user.email;
  }
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = /confirm/i.test(error.message);
    return res.status(401).json({ error: unconfirmed ? "Confirm your email first: check your inbox" : BAD_LOGIN });
  }
  res.json(sessionTokens(data.session));
}));

const NAME_MAX = 40;
const cleanName = (v) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, NAME_MAX);

app.post("/api/auth/signup", route(async (req, res) => {
  const first = cleanName(req.body?.first_name);
  const last = cleanName(req.body?.last_name);
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!first || !last) return res.status(400).json({ error: "Enter your first and last name" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  const phone = P.phoneMetadata(req.body);
  if (phone.error) return res.status(400).json({ error: phone.error });
  if (password.length < 6) return res.status(400).json({ error: "Use at least 6 characters for the password" });

  const fullName = `${first} ${last}`;
  const { data, error } = await authClient().auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return res.status(400).json({ error: error.message });
  if (!data.user || data.user.identities?.length === 0) {
    return res.status(409).json({ error: "An account with this email already exists. Log in instead." });
  }
  const { error: phoneError } = await supabase.auth.admin.updateUserById(data.user.id, { app_metadata: { ...data.user.app_metadata, ...phone.metadata } });
  if (phoneError) throw new Error(phoneError.message);

  const base = U.baseFromName(first, last);
  let username = null;
  for (let attempt = 0; attempt < 3 && !username; attempt++) {
    const candidate = await usernames.pickFree(base);
    const { error: e } = await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName, username: candidate });
    if (!e) username = candidate;
    else if (e.code !== "23505") throw new Error(e.message);
  }

  res.status(201).json({
    username,
    ...(data.session ? sessionTokens(data.session) : { needs_confirmation: true }),
  });
}));

app.get("/api/usernames/check", requireAuth, route(async (req, res) => {
  const name = String(req.query.name ?? "").trim().toLowerCase();
  const problem = U.usernameProblem(name);
  if (problem) return res.json({ available: false, problem });
  const available = await usernames.isAvailable(name, req.user.id);
  res.json({ available, problem: available ? null : "That username is taken" });
}));

app.put("/api/me/username", requireAuth, route(async (req, res) => {
  const name = String(req.body?.username ?? "").trim().toLowerCase();
  const problem = U.usernameProblem(name);
  if (problem) return res.status(400).json({ error: problem });
  if (!(await usernames.isAvailable(name, req.user.id))) return res.status(409).json({ error: "That username is taken" });
  const { error } = await supabase.from("profiles").update({ username: name, updated_at: new Date().toISOString() }).eq("id", req.user.id);
  if (error?.code === "23505") return res.status(409).json({ error: "That username is taken" });
  if (error) throw new Error(error.message);
  res.json({ username: name });
}));

const AI_PROVIDER = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_LITE_MODEL = process.env.GEMINI_LITE_MODEL || "gemini-3.5-flash-lite";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL;
const MODEL_BY_PROVIDER = {
  anthropic: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
  "gemini-lite": GEMINI_LITE_MODEL,
  gemini: GEMINI_MODEL,
  openai: OPENAI_MODEL,
  groq: GROQ_MODEL,
};
const KEY_BY_PROVIDER = { anthropic: "ANTHROPIC_API_KEY", "gemini-lite": "GEMINI_API_KEY", gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", groq: "GROQ_API_KEY" };
const AI_TIMEOUT_MS = 8000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isTemporary = (status) => status === 503 || status === 429 || status === 502;

async function withRetries(attempts, fn) {
  let result;
  for (const { arg, wait } of attempts) {
    if (wait) await sleep(wait);
    result = await fn(arg);
    if (!isTemporary(result.status)) break;
    console.warn(`AI ${arg} returned ${result.status}, retrying...`);
  }
  return result;
}

function chatCompletions({ url, keyName, model, retry = true }) {
  return async ({ prompt, system, json, schema }) => {
    if (!process.env[keyName]) throw new Error(`${keyName} is missing in server/.env`);
    const messages = [
      ...(system || json
        ? [{ role: "system", content: [system, json ? "Respond only with valid JSON." : "", schema ? `JSON shape: ${JSON.stringify(schema)}` : ""].filter(Boolean).join("\n") }]
        : []),
      { role: "user", content: prompt },
    ];
    const r = await withRetries(
      retry ? [{ arg: model, wait: 0 }, { arg: model, wait: 800 }] : [{ arg: model, wait: 0 }],
      async (m) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env[keyName]}` },
          body: JSON.stringify({ model: m, messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });
        return { status: response.status, ok: response.ok, data: await response.json() };
      }
    );
    if (!r.ok) return { status: r.status, error: r.data.error?.message || "AI request failed" };
    const message = r.data.choices?.[0]?.message;
    if (message?.refusal) return { refused: true };
    return { reply: message?.content || "" };
  };
}

const askOpenAI = chatCompletions({ url: "https://api.openai.com/v1/chat/completions", keyName: "OPENAI_API_KEY", model: OPENAI_MODEL });
const askGroq = chatCompletions({ url: "https://api.groq.com/openai/v1/chat/completions", keyName: "GROQ_API_KEY", model: GROQ_MODEL, retry: false });

async function askGemini({ prompt, system, json, schema, model: mainModel = GEMINI_MODEL }) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing in server/.env");
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(json
      ? { generationConfig: { responseMimeType: "application/json", ...(schema ? { responseSchema: schema } : {}) } }
      : {}),
  };
  const r = await withRetries(
    [
      { arg: mainModel, wait: 0 },
      { arg: mainModel, wait: 800 },
      ...(GEMINI_FALLBACK_MODEL && mainModel === GEMINI_MODEL ? [{ arg: GEMINI_FALLBACK_MODEL, wait: 0 }] : []),
    ],
    async (model) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(AI_TIMEOUT_MS) }
      );
      return { status: response.status, ok: response.ok, data: await response.json() };
    }
  );
  if (!r.ok) return { status: r.status, error: r.data.error?.message || "AI request failed" };
  const candidate = r.data.candidates?.[0];
  if (r.data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") return { refused: true };
  return { reply: candidate?.content?.parts?.[0]?.text || "" };
}

const PROVIDERS = {
  anthropic: askAnthropic,
  "gemini-lite": (opts) => askGemini({ ...opts, model: GEMINI_LITE_MODEL }),
  gemini: askGemini,
  openai: askOpenAI,
  groq: askGroq,
};
const AI_CHAIN = ["gemini-lite", "groq", AI_PROVIDER, "anthropic", "gemini", "openai"]
  .filter((p, i, all) => PROVIDERS[p] && all.indexOf(p) === i)
  .filter((p) => process.env[KEY_BY_PROVIDER[p]]);
console.log(
  AI_CHAIN.length
    ? `AI: ${AI_CHAIN.map((p) => `${p} (${MODEL_BY_PROVIDER[p]})`).join(" -> ")}`
    : "AI: no provider has a key. Add ANTHROPIC_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY to server/.env."
);

async function askWithFallback(opts, accept) {
  const failures = [];
  for (const name of AI_CHAIN) {
    try {
      const r = await PROVIDERS[name]({ timeoutMs: AI_TIMEOUT_MS, ...opts });
      if (r.refused) return { refused: true, provider: name };
      if (r.error) {
        failures.push(`${name}: ${r.error}`);
        continue;
      }
      const value = accept(r.reply);
      if (value === undefined) {
        failures.push(`${name}: answer didn't pass validation`);
        continue;
      }
      if (failures.length) console.warn(`AI: answered by ${name} after ${failures.join("; ")}`);
      return { value, provider: name };
    } catch (err) {
      failures.push(`${name}: ${err.name === "TimeoutError" ? "timed out" : err.message}`);
    }
  }
  console.warn(`AI: no provider could answer (${failures.join("; ") || "none configured"})`);
  return { error: "Search is unavailable right now. Try again in a moment." };
}

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const deviceLastSeen = new Map();

const busySlots = (bookings) => bookings.map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at }));

const NO_RATING = { average: null, count: 0 };

const publicReview = (r) => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  author_name: r.author_name,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

function shortName(user, profile) {
  const full = String(profile?.full_name || user.user_metadata?.full_name || "").trim();
  if (!full) return "A renter";
  const [first, ...rest] = full.split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

app.get("/api/garages", requireAuth, route(async (_req, res) => {
  const [garages, ratings] = await Promise.all([repo.listGarages(), repo.ratingSummaries()]);
  res.json({ garages: garages.filter((g) => !g.hidden).map((g) => ({ ...G.publicGarage(g), rating: ratings.get(g.id) ?? NO_RATING })) });
}));

app.get("/api/garages/mine", requireAuth, route(async (req, res) => {
  const garages = await repo.listGaragesByHost(req.user.id);
  res.json({ garages: garages.map((g) => ({ ...g, device_last_seen: deviceLastSeen.get(g.id) ?? null })) });
}));

app.get("/api/garages/:id", requireAuth, route(async (req, res) => {
  const garage = await repo.getGarage(req.params.id);
  if (!garage) return res.status(404).json({ error: "Garage not found" });
  const isHost = garage.host_id === req.user.id;
  const [bookings, reviews, ratings] = await Promise.all([
    repo.listBookingsForGarage(garage.id),
    repo.listReviewsForGarage(garage.id),
    repo.ratingSummaries(),
  ]);
  const paidHere = bookings.some((b) => b.renter_id === req.user.id && b.status === "paid");
  res.json({
    garage: { ...(isHost ? garage : G.publicGarage(garage)), rating: ratings.get(garage.id) ?? NO_RATING },
    host_phone: await hostPhoneFor(garage, req.user.id, paidHere),
    busy: busySlots(bookings.filter((b) => new Date(b.ends_at) > new Date())),
    reviews: reviews.map(publicReview),
  });
}));

const migrationNeeded = (file) => `The database needs an update first: run supabase/${file} in Supabase`;
const MIGRATION_NEEDED = migrationNeeded("garage-visibility.sql");
const missingColumn = (e) => /column/i.test(e?.message ?? "") && /schema cache|does not exist/i.test(e.message);

function garageFields(b = {}) {
  const errors = [];
  const title = String(b.title ?? "").trim();
  const city = b.city == null || b.city === "" ? G.DEFAULT_CITY : String(b.city);
  if (!G.cityByName(city)) errors.push("city must be one of the listed cities");
  const area = String(b.area ?? "").trim() || city;
  if (!title) errors.push("title is required");
  if (!G.SIZES.includes(b.size)) errors.push(`size must be one of ${G.SIZES.join(", ")}`);
  if (!G.ACCESS.includes(b.access)) errors.push(`access must be one of ${G.ACCESS.join(", ")}`);
  const priceHour = Number(b.price_hour);
  const priceDay = Number(b.price_day);
  if (!(priceHour > 0)) errors.push("price_hour must be above 0");
  if (!(priceDay > 0)) errors.push("price_day must be above 0");
  const lat = b.latitude == null ? null : Number(b.latitude);
  const lng = b.longitude == null ? null : Number(b.longitude);
  if ((lat != null && !Number.isFinite(lat)) || (lng != null && !Number.isFinite(lng))) errors.push("location is invalid");
  else if (lat != null && lng != null && !G.inBulgaria(lat, lng)) errors.push("location must be in Bulgaria");
  const description = String(b.description ?? "").trim();
  if (description.length > G.DESCRIPTION_MAX) errors.push(`description can be at most ${G.DESCRIPTION_MAX} characters`);
  const { availability, error: availabilityError } = G.normalizeAvailability(b.availability);
  if (availabilityError) errors.push(availabilityError);
  if (errors.length) return { error: errors.join("; ") };

  return {
    fields: {
      title: title.slice(0, 120),
      city,
      area: area.slice(0, 80),
      address: String(b.address ?? "").trim().slice(0, 160) || null,
      latitude: lat,
      longitude: lng,
      size: b.size,
      covered: !!b.covered,
      price_hour: priceHour,
      price_day: priceDay,
      access: b.access,
      image_url: /^https?:\/\//.test(b.image_url ?? "") ? String(b.image_url).slice(0, 500) : null,
      description: description || null,
      availability,
    },
  };
}

app.post("/api/garages", requireAuth, route(async (req, res) => {
  const { fields, error } = garageFields(req.body);
  if (error) return res.status(400).json({ error });
  const garage = await saveWithCity(fields, (f) => repo.createGarage({ host_id: req.user.id, ...f }));
  if (!garage) return res.status(503).json({ error: migrationNeeded("cities.sql") });
  res.status(201).json({ garage });
}));

app.patch("/api/garages/:id", requireAuth, route(async (req, res) => {
  const garage = await repo.getGarage(req.params.id);
  if (!garage) return res.status(404).json({ error: "Garage not found" });
  if (garage.host_id !== req.user.id) return res.status(403).json({ error: "Only the garage's host can edit it" });
  const { fields, error } = garageFields(req.body);
  if (error) return res.status(400).json({ error });
  const saved = await saveWithCity(fields, (f) => repo.updateGarage(garage.id, f));
  if (!saved) return res.status(503).json({ error: migrationNeeded("cities.sql") });
  res.json({ garage: saved });
}));

async function saveWithCity(fields, save) {
  try {
    return await save(fields);
  } catch (e) {
    if (!missingColumn(e)) throw e;
    if (fields.city !== G.DEFAULT_CITY) return null;
    const { city: _city, ...rest } = fields;
    return save(rest);
  }
}

const geoLang = (v) => (v === "en" ? "en" : "bg");
const finiteOrNull = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

app.get("/api/geo/search", requireAuth, route(async (req, res) => {
  const q = String(req.query.q ?? "").replace(/\s+/g, " ").trim();
  if (q.length < 3 || q.length > 160) return res.status(400).json({ error: "Type 3 to 160 characters of the address" });
  if (!G.cityByName(String(req.query.city ?? ""))) return res.status(400).json({ error: "city must be one of the listed cities" });
  res.json(await geo.searchAddress({ q, city: String(req.query.city), lang: geoLang(req.query.lang) }));
}));

app.get("/api/geo/reverse", requireAuth, route(async (req, res) => {
  const lat = finiteOrNull(req.query.lat);
  const lng = finiteOrNull(req.query.lng);
  if (lat == null || lng == null || !G.inBulgaria(lat, lng)) return res.status(400).json({ error: "location must be in Bulgaria" });
  res.json(await geo.reverseGeocode({ lat, lng, lang: geoLang(req.query.lang) }));
}));

async function ownGarage(req, res) {
  const garage = await repo.getGarage(req.params.id);
  if (!garage) {
    res.status(404).json({ error: "Garage not found" });
    return null;
  }
  if (garage.host_id !== req.user.id) {
    res.status(403).json({ error: "Only the garage's host can edit it" });
    return null;
  }
  return garage;
}

app.put("/api/garages/:id/visibility", requireAuth, route(async (req, res) => {
  const garage = await ownGarage(req, res);
  if (!garage) return;
  const hidden = req.body?.hidden;
  if (typeof hidden !== "boolean") return res.status(400).json({ error: "hidden must be true or false" });
  try {
    res.json({ garage: await repo.updateGarage(garage.id, { hidden }) });
  } catch (e) {
    if (missingColumn(e)) return res.status(503).json({ error: MIGRATION_NEEDED });
    throw e;
  }
}));

app.delete("/api/garages/:id", requireAuth, route(async (req, res) => {
  const garage = await ownGarage(req, res);
  if (!garage) return;
  const now = new Date();
  const ongoing = (await repo.listBookingsForGarage(garage.id)).filter((b) => new Date(b.ends_at) > now);
  if (ongoing.length) {
    return res.status(409).json({
      error: "This garage still has bookings that haven't ended. Hide it now and delete it after the last one.",
      bookings: ongoing.length,
    });
  }
  try {
    await repo.deleteGarage(garage.id);
  } catch (e) {
    if (missingColumn(e)) return res.status(503).json({ error: MIGRATION_NEEDED });
    throw e;
  }
  deviceLastSeen.delete(garage.id);
  res.json({ deleted: true });
}));

const searchCache = new Map();

const NO_FILTERS = { on_topic: true, city: null, area: null, from: null, to: null, vehicle_size: null, covered: null, wants: null, terms: [] };

app.post("/api/garages/search", requireAuth, route(async (req, res) => {
  const query = G.sanitizeQuery(req.body?.query);
  const nowLocal = String(req.body?.now_local ?? "");
  const tzOffset = Number(req.body?.tz_offset ?? 0);
  const timeZone = typeof req.body?.time_zone === "string" ? req.body.time_zone : null;
  if (!query) return res.status(400).json({ error: "Missing query" });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(nowLocal)) return res.status(400).json({ error: "now_local must look like 2026-10-24T16:30" });

  const [garages, bookings, ratings] = await Promise.all([repo.listGarages(), repo.listAllLiveBookings(), repo.ratingSummaries()]);
  const visible = garages.filter((g) => !g.hidden);
  const reply = (filters, found, extra = {}) =>
    res.json({
      filters,
      from_utc: null,
      to_utc: null,
      center: null,
      wants_checked: false,
      ...extra,
      garages: found.map((g) => ({ ...G.publicGarage(g), rating: ratings.get(g.id) ?? NO_RATING })),
    });

  const named = G.titleMatches(query, visible);
  if (named.length) {
    const first = named[0];
    const center = first.latitude != null ? { latitude: first.latitude, longitude: first.longitude } : null;
    return reply({ ...NO_FILTERS, wants: query }, named, { center, wants_checked: true });
  }

  const cacheKey = `${query.toLowerCase()}|${nowLocal.slice(0, 13)}`;
  let filters = searchCache.get(cacheKey);
  if (!filters) {
    const result = await askWithFallback(
      { prompt: G.buildSearchPrompt(query, nowLocal), system: G.SEARCH_SYSTEM, json: true, schema: G.SEARCH_SCHEMA },
      (r) => G.cleanFilters(parseJson(r))
    );
    if (result.error) {
      filters = { ...NO_FILTERS, city: G.cityInText(query) };
    } else {
      filters = result.refused ? G.cleanFilters({ on_topic: false }) : result.value;
      if (searchCache.size > 500) searchCache.clear();
      searchCache.set(cacheKey, filters);
    }
  }

  if (!filters.on_topic) {
    return res.json({ off_topic: true, hint: G.OFF_TOPIC_HINT, filters, from_utc: null, to_utc: null, center: null, garages: [] });
  }

  let fromUtc = G.localToUtc(filters.from, tzOffset, timeZone);
  let toUtc = G.localToUtc(filters.to, tzOffset, timeZone);
  if (!fromUtc || !toUtc || new Date(toUtc) <= new Date(fromUtc)) fromUtc = toUtc = null;

  const matches = visible.filter(
    (g) =>
      (!filters.city || (g.city ?? G.DEFAULT_CITY) === filters.city) &&
      G.fits(g.size, filters.vehicle_size) &&
      (filters.covered !== true || g.covered) &&
      (!fromUtc || G.isAvailable(g, fromUtc, toUtc)) &&
      (!fromUtc || !bookings.some((b) => b.garage_id === g.id && G.overlaps(b.starts_at, b.ends_at, fromUtc, toUtc)))
  );
  const area = G.AREAS.find((a) => a.name === filters.area) ?? G.cityByName(filters.city);

  let found = matches;
  let wantsChecked = false;
  if (filters.wants) {
    const hits = G.matchTerms([...filters.terms, filters.wants], matches);
    if (hits) {
      found = hits;
      wantsChecked = true;
    }
  }

  reply(filters, found, {
    from_utc: fromUtc,
    to_utc: toUtc,
    center: area ? { latitude: area.latitude, longitude: area.longitude } : null,
    wants_checked: wantsChecked,
  });
}));

const MAX_BOOKING_DAYS = 31;
const HOLD_MS = 10 * 60000;

app.post("/api/bookings", requireAuth, route(async (req, res) => {
  const { garage_id, starts_at, ends_at, mode } = req.body || {};
  const garage = await repo.getGarage(garage_id);
  if (!garage) return res.status(404).json({ error: "Garage not found" });
  if (garage.hidden) return res.status(409).json({ error: "This garage isn't taking bookings right now" });
  if (!G.BOOKING_MODES.includes(mode)) return res.status(400).json({ error: "mode must be hour or day" });

  const start = new Date(starts_at);
  const end = new Date(ends_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return res.status(400).json({ error: "Invalid dates" });
  if (end <= start) return res.status(400).json({ error: "The end must be after the start" });
  if (start < new Date(Date.now() - G.HOUR_MS)) return res.status(400).json({ error: "That time has already passed" });
  if (end - start > MAX_BOOKING_DAYS * 24 * G.HOUR_MS) return res.status(400).json({ error: `Bookings can be at most ${MAX_BOOKING_DAYS} days` });

  if (!G.isAvailable(garage, start, end)) {
    return res.status(409).json({ error: "The host hasn't made the garage available then. Pick a time inside its free hours." });
  }

  const existing = await repo.listBookingsForGarage(garage.id);
  if (existing.some((b) => G.overlaps(b.starts_at, b.ends_at, start, end))) {
    return res.status(409).json({ error: "Someone already booked part of that time. Pick another slot." });
  }

  const price = computePrice(garage, start, end, mode);
  let booking;
  try {
    booking = await repo.createBooking({
      garage_id: garage.id,
      renter_id: req.user.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      mode,
      total_price: price.amount_cents / 100,
      amount_cents: price.amount_cents,
      expires_at: new Date(Date.now() + HOLD_MS).toISOString(),
    });
  } catch (err) {
    if (/bookings_no_overlap|exclusion/i.test(err.message)) {
      return res.status(409).json({ error: "Someone already booked part of that time. Pick another slot." });
    }
    throw err;
  }
  const payment = await payments.createPayment({
    bookingId: booking.id,
    userId: req.user.id,
    amountCents: price.amount_cents,
    platformFeeCents: price.platform_fee_cents,
    hostPayoutCents: price.host_payout_cents,
    currency: price.currency,
  });

  res.status(201).json({
    booking_id: booking.id,
    payment_id: payment.id,
    amount_cents: price.amount_cents,
    platform_fee_cents: price.platform_fee_cents,
    currency: price.currency,
    expires_at: booking.expires_at,
    units: price.units,
    unit: price.unit,
    unit_price_cents: price.unit_price_cents,
  });
}));

const paymentSummary = (p) =>
  p && {
    id: p.id,
    status: p.status,
    amount_cents: p.amount_cents,
    currency: p.currency,
    method: p.method,
    card_last4: p.card_last4,
    card_brand: p.card_brand,
  };

app.get("/api/bookings/mine", requireAuth, route(async (req, res) => {
  const [bookings, garages] = await Promise.all([repo.listBookingsByRenter(req.user.id), repo.listGarages({ includeDeleted: true })]);
  const ids = bookings.map((b) => b.id);
  const [pays, reviews] = await Promise.all([repo.listPaymentsForBookings(ids), repo.listReviewsForBookings(ids)]);
  const byId = new Map(garages.map((g) => [g.id, G.publicGarage(g)]));
  const payByBooking = new Map(pays.map((p) => [p.booking_id, p]));
  const reviewByBooking = new Map(reviews.map((r) => [r.booking_id, publicReview(r)]));
  const hostIds = [...new Set(bookings.filter((b) => b.status === "paid").map((b) => byId.get(b.garage_id)?.host_id).filter(Boolean))];
  const hostPhones = new Map(await Promise.all(hostIds.map(async (id) => [id, P.phoneOf(await hostUser(id))?.number ?? null])));
  res.json({
    bookings: bookings.map((b) => ({
      ...b,
      garage: byId.get(b.garage_id) ?? null,
      host_phone: b.status === "paid" ? hostPhones.get(byId.get(b.garage_id)?.host_id) ?? null : null,
      payment: paymentSummary(payByBooking.get(b.id)) ?? null,
      review: reviewByBooking.get(b.id) ?? null,
    })),
  });
}));

const MAX_COMMENT = 500;
app.put("/api/bookings/:id/review", requireAuth, route(async (req, res) => {
  const booking = await repo.getBooking(req.params.id);
  if (!booking || booking.renter_id !== req.user.id) return res.status(404).json({ error: "Booking not found" });
  if (booking.status !== "paid") return res.status(409).json({ error: "Only paid bookings can be reviewed" });
  if (new Date(booking.starts_at) > new Date()) return res.status(409).json({ error: "You can review this garage once your booking starts" });

  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "Pick 1 to 5 stars" });
  const comment = String(req.body?.comment ?? "").trim();
  if (comment.length > MAX_COMMENT) return res.status(400).json({ error: `Keep the comment under ${MAX_COMMENT} characters` });

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", req.user.id).maybeSingle();
  const review = await repo.upsertReview({
    booking_id: booking.id,
    garage_id: booking.garage_id,
    renter_id: req.user.id,
    rating,
    comment: comment || null,
    author_name: shortName(req.user, profile),
  });
  res.json({ review: publicReview(review) });
}));

app.post("/api/bookings/:id/cancel", requireAuth, route(async (req, res) => {
  const booking = await repo.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.renter_id !== req.user.id) return res.status(403).json({ error: "This isn't your booking" });
  if (booking.status === "cancelled") return res.status(409).json({ error: "This booking is already cancelled" });
  if (booking.status === "expired") return res.status(409).json({ error: "This reservation already expired" });

  const [payment] = await repo.listPaymentsForBookings([booking.id]);
  let refundedCents = 0;
  if (booking.status === "paid") {
    if (new Date(booking.starts_at) <= new Date()) {
      return res.status(409).json({ error: "This booking has already started, so it can't be cancelled" });
    }
    if (payment?.status === "succeeded") {
      await payments.refundPayment({ paymentId: payment.id });
      refundedCents = payment.amount_cents;
    }
  }
  await repo.updateBooking(booking.id, { status: "cancelled" });
  res.json({ status: "cancelled", refund: refundedCents > 0, refunded_cents: refundedCents });
}));

const MINUTE_MS = 60000;
app.post("/api/bookings/:id/leave", requireAuth, route(async (req, res) => {
  const booking = await repo.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.renter_id !== req.user.id) return res.status(403).json({ error: "This isn't your booking" });
  if (booking.status !== "paid") return res.status(409).json({ error: "Only a paid booking can end early" });
  const now = new Date();
  if (new Date(booking.starts_at) > now) return res.status(409).json({ error: "This booking hasn't started yet. Cancel it instead." });
  if (new Date(booking.ends_at) <= now) return res.status(409).json({ error: "This booking has already ended" });

  const endsAt = new Date(Math.max(Math.floor(now / MINUTE_MS) * MINUTE_MS, new Date(booking.starts_at).getTime() + MINUTE_MS));
  const patch = { ends_at: endsAt.toISOString(), left_early_at: now.toISOString() };
  let updated;
  try {
    updated = await repo.updateBooking(booking.id, patch);
  } catch (e) {
    if (!missingColumn(e)) throw e;
    updated = await repo.updateBooking(booking.id, { ends_at: patch.ends_at });
  }
  res.json({ booking: updated });
}));

async function ownPayment(req, res) {
  const payment = await repo.getPayment(req.params.id);
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return null;
  }
  if (payment.user_id !== req.user.id) {
    res.status(403).json({ error: "This isn't your payment" });
    return null;
  }
  return payment;
}

app.post("/api/payments/:id/confirm", requireAuth, route(async (req, res) => {
  const payment = await ownPayment(req, res);
  if (!payment) return;
  const { card_number, wallet, idempotency_key, action_confirmed } = req.body || {};
  const key = String(idempotency_key ?? "");
  if (!/^[\w-]{8,100}$/.test(key)) return res.status(400).json({ error: "idempotency_key is required" });
  if (!wallet && !action_confirmed && !card_number) return res.status(400).json({ error: "Enter a card number or use the demo wallet" });

  const booking = await repo.getBooking(payment.booking_id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status === "expired") return res.status(409).json({ error: "Reservation expired. Book the slot again." });
  if (booking.status === "cancelled") return res.status(409).json({ error: "This booking was cancelled" });

  const result = await payments.confirmPayment({
    paymentId: payment.id,
    cardNumber: card_number,
    wallet: wallet === true,
    idempotencyKey: key,
    actionConfirmed: action_confirmed === true,
  });
  if (result.status === "succeeded" && booking.status !== "paid") {
    await repo.updateBooking(booking.id, { status: "paid", expires_at: null });
  }
  res.json(result);
}));

app.get("/api/payments/:id", requireAuth, route(async (req, res) => {
  const payment = await ownPayment(req, res);
  if (payment) res.json(paymentSummary(payment));
}));

app.get("/api/host/earnings", requireAuth, route(async (req, res) => {
  const garages = await repo.listGaragesByHost(req.user.id, { includeDeleted: true });
  const bookings = await repo.listBookingsForGarages(garages.map((g) => g.id));
  const pays = (await repo.listPaymentsForBookings(bookings.map((b) => b.id))).filter((p) => p.status === "succeeded");
  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const garageById = new Map(garages.map((g) => [g.id, g]));

  const rows = pays
    .map((p) => {
      const b = bookingById.get(p.booking_id);
      return {
        booking_id: b.id,
        garage_id: b.garage_id,
        garage_title: garageById.get(b.garage_id)?.title ?? "Garage",
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        amount_cents: p.amount_cents,
        host_payout_cents: p.host_payout_cents,
      };
    })
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

  res.json({
    total_payout_cents: rows.reduce((sum, r) => sum + r.host_payout_cents, 0),
    currency: "EUR",
    bookings: rows,
  });
}));

const COMMAND_TIMEOUT_MS = 20000;
const isStale = (c) => Date.now() - new Date(c.created_at).getTime() > COMMAND_TIMEOUT_MS;

const doorRoute = (action) => route(async (req, res) => {
  const garage = await repo.getGarage(req.params.id);
  if (!garage) return res.status(404).json({ error: "Garage not found" });
  if (garage.access !== "app") return res.status(400).json({ error: "This garage is opened by the host, not from the app" });

  const booking = await repo.findActiveBooking(req.user.id, garage.id);
  if (!booking) return res.status(403).json({ error: "No paid active booking for this garage" });

  const command = await repo.createCommand({ garage_id: garage.id, booking_id: booking.id, requested_by: req.user.id, action });
  res.status(201).json({ command_id: command.id });
});

app.post("/api/garages/:id/open", requireAuth, doorRoute("open"));
app.post("/api/garages/:id/close", requireAuth, doorRoute("close"));

app.get("/api/commands/:id", requireAuth, route(async (req, res) => {
  let command = await repo.getCommand(req.params.id);
  if (!command || command.requested_by !== req.user.id) return res.status(404).json({ error: "Command not found" });
  if (command.status === "queued" && isStale(command)) {
    command = await repo.updateCommand(command.id, { status: "error", error: "The door didn't respond. Is the device online?" });
  }
  res.json({ status: command.status, acked_at: command.acked_at, error: command.error });
}));

app.get("/api/device/commands", requireDevice, route(async (req, res) => {
  const command = await repo.takeNextCommand(req.garage.id);
  if (!command) return res.json({});
  if (isStale(command)) {
    await repo.updateCommand(command.id, { status: "error", error: "Expired before the device picked it up" });
    return res.json({});
  }
  res.json({ command_id: command.id, action: command.action });
}));

app.post("/api/device/ack", requireDevice, route(async (req, res) => {
  const { command_id, status, error } = req.body || {};
  if (!["opened", "error"].includes(status)) return res.status(400).json({ error: "status must be opened or error" });
  const command = await repo.getCommand(command_id);
  if (!command || command.garage_id !== req.garage.id) return res.status(404).json({ error: "Command not found" });
  if (command.status !== "queued") return res.json({ ok: true });

  await repo.updateCommand(command.id, {
    status,
    acked_at: new Date().toISOString(),
    error: status === "error" ? String(error || "The device reported an error").slice(0, 200) : null,
  });
  res.json({ ok: true });
}));

const PHOTO_LIMIT = 30;
const photoUploads = new Map();
app.post(PHOTO_PATH, requireAuth, photoBody, route(async (req, res) => {
  const now = Date.now();
  const recent = (photoUploads.get(req.user.id) ?? []).filter((t) => now - t < 3600000);
  if (recent.length >= PHOTO_LIMIT) return res.status(429).json({ error: "Too many photos for now. Try again in an hour." });

  const buffer = photos.decodeBase64(req.body?.data);
  if (!buffer?.length) return res.status(400).json({ error: "Pick a photo to upload" });
  if (buffer.length > photos.MAX_BYTES) return res.status(413).json({ error: "That photo is too big. Pick a smaller one." });
  const type = photos.sniff(buffer);
  if (!type) return res.status(400).json({ error: "That file isn't a photo. Use a JPEG, PNG or WebP." });

  recent.push(now);
  photoUploads.set(req.user.id, recent);
  const url = await photoStore.save({ buffer, type, userId: req.user.id, baseUrl: `${req.protocol}://${req.get("host")}` });
  res.status(201).json({ url });
}));

A.registerAdmin(app, { supabase, repo, requireAuth, route, deviceLastSeen });

const WEB_DIR = path.join(__dirname, "..", "dist");
if (fs.existsSync(path.join(WEB_DIR, "index.html"))) {
  app.use(express.static(WEB_DIR, { index: "index.html" }));
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => res.sendFile(path.join(WEB_DIR, "index.html")));
}

app.use((err, _req, res, _next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That photo is too big. Pick a smaller one." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
  res.status(500).json({ error: err.message });
});

app.listen(PORT, (err) => {
  if (err) {
    console.error(`Could not start on port ${PORT}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Payments: ${payments.name}${payments.name === "mock" ? " (fake checkout, test cards in payments/mock.js)" : ""}`);
  console.log(`Demo device keys (seed garages g1, g2): ${repo.SEED_KEYS.g1}, ${repo.SEED_KEYS.g2}`);
});
