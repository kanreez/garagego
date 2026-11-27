const G = require("./garages");

const BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "GarageGo/1.0 (https://garagego.pages.dev)";
const GAP_MS = 1100;
const TIMEOUT_MS = 6000;
const MAX_CACHE = 2000;

const cache = new Map();
let queue = Promise.resolve();
let lastSentAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function inQueue(fn) {
  const run = queue.then(async () => {
    const wait = lastSentAt + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastSentAt = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

async function nominatim(path, params) {
  const query = new URLSearchParams({ format: "jsonv2", addressdetails: "1", ...params });
  if (process.env.GEOCODER_EMAIL) query.set("email", process.env.GEOCODER_EMAIL);
  const url = `${BASE}${path}?${query}`;
  const key = url.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const data = await inQueue(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Nominatim answered ${res.status}`);
    return res.json();
  });
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, data);
  return data;
}

function matchCity(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/^(град|grad|city of)\s+/, "");
  return G.CITIES.find((c) => c.name.toLowerCase() === n || c.bg.toLowerCase() === n)?.name ?? null;
}

function normalize(item) {
  const a = item.address ?? {};
  const address = [a.road, a.house_number].filter(Boolean).join(" ") || item.name || null;
  const district = a.suburb ?? a.city_district ?? a.quarter ?? a.neighbourhood ?? null;
  const city = matchCity(a.city) ?? matchCity(a.town) ?? matchCity(a.village);
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  const label = [address, district].filter(Boolean).join(", ") || String(item.display_name ?? "").split(",").slice(0, 2).join(",").trim();
  return { label, address, district, city, latitude, longitude };
}

const usable = (r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && G.inBulgaria(r.latitude, r.longitude);

async function searchAddress({ q, city, lang }) {
  const c = G.cityByName(city);
  try {
    const data = await nominatim("/search", {
      q,
      limit: "5",
      countrycodes: "bg",
      "accept-language": lang,
      viewbox: [c.longitude - 0.2, c.latitude + 0.15, c.longitude + 0.2, c.latitude - 0.15].map((n) => n.toFixed(4)).join(","),
      bounded: "1",
    });
    return { results: (Array.isArray(data) ? data : []).map(normalize).filter(usable).slice(0, 5) };
  } catch (e) {
    console.warn(`Address search failed: ${e.message}`);
    return { results: [], unavailable: true };
  }
}

async function reverseGeocode({ lat, lng, lang }) {
  try {
    const data = await nominatim("/reverse", { lat: lat.toFixed(6), lon: lng.toFixed(6), zoom: "18", "accept-language": lang });
    if (!data || data.error) return { result: null };
    const result = normalize(data);
    return { result: usable(result) ? result : null };
  } catch (e) {
    console.warn(`Address lookup failed: ${e.message}`);
    return { result: null, unavailable: true };
  }
}

module.exports = { searchAddress, reverseGeocode };
