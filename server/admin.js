const P = require("./phones");

const ONLINE_MS = 10000;
const FOREVER = "876000h";
const LIVE = ["pending_payment", "paid"];

const adminEmails = () =>
  String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

function isAdmin(user) {
  if (!user) return false;
  if (user.app_metadata?.role === "admin") return true;
  return !!user.email && adminEmails().includes(user.email.toLowerCase());
}

const isBlocked = (user) => !!user?.banned_until && new Date(user.banned_until) > new Date();

const sofiaDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Sofia" });

function registerAdmin(app, { supabase, repo, requireAuth, route, deviceLastSeen }) {
  const requireAdmin = (req, res, next) =>
    requireAuth(req, res, () => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admins only" })));

  async function allUsers() {
    const users = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      users.push(...data.users);
      if (data.users.length < 1000) return users;
    }
  }

  async function profilesById() {
    const { data, error } = await supabase.from("profiles").select("id, username, full_name");
    if (error) throw new Error(error.message);
    return new Map(data.map((p) => [p.id, p]));
  }

  async function ongoingBookings() {
    const now = new Date();
    return (await repo.listAllBookings()).filter((b) => LIVE.includes(b.status) && new Date(b.ends_at) > now);
  }

  async function getUser(id) {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data?.user) return null;
    return data.user;
  }

  app.get("/api/admin/overview", requireAdmin, route(async (_req, res) => {
    const [users, garages, bookings, payments] = await Promise.all([
      allUsers(),
      repo.listGarages(),
      repo.listAllBookings(),
      repo.listAllPayments(),
    ]);
    const now = new Date();
    const today = sofiaDay(now);
    const paid = bookings.filter((b) => b.status === "paid");
    const succeeded = payments.filter((p) => p.status === "succeeded");
    res.json({
      users: users.length,
      blocked: users.filter(isBlocked).length,
      garages: garages.length,
      hidden: garages.filter((g) => g.hidden).length,
      bookings_today: paid.filter((b) => sofiaDay(b.starts_at) === today).length,
      active_now: paid.filter((b) => new Date(b.starts_at) <= now && new Date(b.ends_at) > now).length,
      revenue_cents: succeeded.reduce((s, p) => s + p.amount_cents, 0),
      fee_cents: succeeded.reduce((s, p) => s + p.platform_fee_cents, 0),
    });
  }));

  app.get("/api/admin/garages", requireAdmin, route(async (_req, res) => {
    const [garages, profiles, ongoing] = await Promise.all([repo.listGarages(), profilesById(), ongoingBookings()]);
    const now = Date.now();
    res.json({
      garages: garages.map((g) => {
        const seen = deviceLastSeen.get(g.id) ?? null;
        const host = profiles.get(g.host_id);
        return {
          id: g.id,
          title: g.title,
          city: g.city,
          area: g.area,
          address: g.address,
          access: g.access,
          hidden: !!g.hidden,
          created_at: g.created_at,
          host_id: g.host_id,
          host_name: host?.full_name ?? null,
          host_username: host?.username ?? null,
          ongoing: ongoing.filter((b) => b.garage_id === g.id).length,
          device_last_seen: seen,
          device_online: !!seen && now - new Date(seen).getTime() < ONLINE_MS,
        };
      }),
    });
  }));

  app.put("/api/admin/garages/:id/visibility", requireAdmin, route(async (req, res) => {
    const garage = await repo.getGarage(req.params.id);
    if (!garage) return res.status(404).json({ error: "Garage not found" });
    if (typeof req.body?.hidden !== "boolean") return res.status(400).json({ error: "hidden must be true or false" });
    await repo.updateGarage(garage.id, { hidden: req.body.hidden });
    res.json({ hidden: req.body.hidden });
  }));

  app.delete("/api/admin/garages/:id", requireAdmin, route(async (req, res) => {
    const garage = await repo.getGarage(req.params.id);
    if (!garage) return res.status(404).json({ error: "Garage not found" });
    if ((await ongoingBookings()).some((b) => b.garage_id === garage.id)) {
      if (!garage.hidden) await repo.updateGarage(garage.id, { hidden: true });
      return res.status(409).json({ error: "This garage has a booking that hasn't ended. It is hidden now; delete it after the booking ends." });
    }
    await repo.deleteGarage(garage.id);
    deviceLastSeen.delete(garage.id);
    res.json({ deleted: true });
  }));

  app.get("/api/admin/users", requireAdmin, route(async (_req, res) => {
    const [users, profiles, garages] = await Promise.all([allUsers(), profilesById(), repo.listGarages()]);
    res.json({
      users: users
        .map((u) => {
          const p = profiles.get(u.id);
          return {
            id: u.id,
            email: u.email ?? null,
            full_name: p?.full_name ?? u.user_metadata?.full_name ?? null,
            username: p?.username ?? null,
            phone: P.phoneOf(u)?.number ?? null,
            created_at: u.created_at,
            blocked: isBlocked(u),
            admin: isAdmin(u),
            garages: garages.filter((g) => g.host_id === u.id).length,
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    });
  }));

  async function guardTarget(req, res) {
    const target = await getUser(req.params.id);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return null;
    }
    if (target.id === req.user.id || isAdmin(target)) {
      res.status(403).json({ error: "Admins can't block or delete themselves or other admins" });
      return null;
    }
    return target;
  }

  app.put("/api/admin/users/:id/block", requireAdmin, route(async (req, res) => {
    const target = await guardTarget(req, res);
    if (!target) return;
    const blocked = req.body?.blocked;
    if (typeof blocked !== "boolean") return res.status(400).json({ error: "blocked must be true or false" });

    const meta = { ...target.app_metadata };
    if (blocked) {
      const theirs = await repo.listGaragesByHost(target.id);
      const hiding = theirs.filter((g) => !g.hidden);
      for (const g of hiding) await repo.updateGarage(g.id, { hidden: true });
      meta.hidden_by_admin = [...new Set([...(meta.hidden_by_admin ?? []), ...hiding.map((g) => g.id)])];
    } else {
      for (const id of meta.hidden_by_admin ?? []) {
        if (await repo.getGarage(id)) await repo.updateGarage(id, { hidden: false });
      }
      delete meta.hidden_by_admin;
    }
    const { error } = await supabase.auth.admin.updateUserById(target.id, {
      ban_duration: blocked ? FOREVER : "none",
      app_metadata: meta,
    });
    if (error) throw new Error(error.message);
    res.json({ blocked });
  }));

  app.delete("/api/admin/users/:id", requireAdmin, route(async (req, res) => {
    const target = await guardTarget(req, res);
    if (!target) return;
    const profile = (await profilesById()).get(target.id);
    const expected = String(profile?.username || target.email || "").toLowerCase();
    if (String(req.body?.confirm ?? "").trim().toLowerCase() !== expected) {
      return res.status(400).json({ error: "Type the username exactly to confirm" });
    }
    const theirGarages = new Set((await repo.listGaragesByHost(target.id, { includeDeleted: true })).map((g) => g.id));
    const busy = (await ongoingBookings()).some((b) => b.renter_id === target.id || theirGarages.has(b.garage_id));
    if (busy) {
      return res.status(409).json({ error: "This person has a booking that hasn't ended. Block them now and delete them after it ends." });
    }
    const { error } = await supabase.auth.admin.deleteUser(target.id);
    if (error) throw new Error(error.message);
    for (const id of theirGarages) deviceLastSeen.delete(id);
    res.json({ deleted: true });
  }));

  app.get("/api/admin/reviews", requireAdmin, route(async (_req, res) => {
    const [reviews, garages] = await Promise.all([repo.listAllReviews(), repo.listGarages({ includeDeleted: true })]);
    const titles = new Map(garages.map((g) => [g.id, g.title]));
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        author_name: r.author_name,
        created_at: r.created_at,
        garage_id: r.garage_id,
        garage_title: titles.get(r.garage_id) ?? null,
      })),
    });
  }));

  app.delete("/api/admin/reviews/:id", requireAdmin, route(async (req, res) => {
    if (!(await repo.deleteReview(req.params.id))) return res.status(404).json({ error: "Review not found" });
    res.json({ deleted: true });
  }));
}

module.exports = { registerAdmin, isAdmin, isBlocked };
