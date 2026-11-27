const USERNAME_RE = /^[a-z][a-z0-9._]{1,18}[a-z0-9]$/;
const RESERVED = new Set(["admin", "administrator", "support", "help", "garagego", "root", "system", "host", "renter", "null"]);

const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya", ё: "yo", ы: "y", э: "e", є: "ye", і: "i", ї: "yi",
};

const transliterate = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (ch) => CYRILLIC[ch] ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const slug = (s) => transliterate(s).replace(/[^a-z0-9]+/g, "");

function baseFromName(first, last) {
  let base = [slug(first), slug(last)].filter(Boolean).join(".");
  if (!/^[a-z]/.test(base)) base = `user${base}`.replace(/\.$/, "");
  base = base.slice(0, 17).replace(/[._]+$/, "");
  return base.length >= 3 ? base : `${base}user`.slice(0, 17);
}

function usernameProblem(name) {
  if (!USERNAME_RE.test(name)) {
    return "Use 3 to 20 characters: Latin letters, numbers, dots or underscores, starting with a letter";
  }
  if (/[._]{2}/.test(name)) return "Don't put two dots or underscores in a row";
  if (RESERVED.has(name)) return "That username is reserved";
  return null;
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function createUsernames(supabase) {
  async function owners(name) {
    const { data, error } = await supabase.from("profiles").select("id").ilike("username", escapeLike(name));
    if (error) throw new Error(error.message);
    return data.map((r) => r.id);
  }

  async function isAvailable(name, exceptUserId) {
    if (usernameProblem(name)) return false;
    return (await owners(name)).every((id) => id === exceptUserId);
  }

  async function pickFree(base) {
    const { data, error } = await supabase.from("profiles").select("username").ilike("username", `${escapeLike(base)}%`);
    if (error) throw new Error(error.message);
    const taken = new Set(data.map((r) => String(r.username).toLowerCase()));
    if (!taken.has(base) && !RESERVED.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
  }

  async function idFor(name) {
    const ids = await owners(String(name).trim().toLowerCase());
    return ids[0] ?? null;
  }

  return { isAvailable, pickFree, idFor };
}

module.exports = { baseFromName, usernameProblem, transliterate, createUsernames };
