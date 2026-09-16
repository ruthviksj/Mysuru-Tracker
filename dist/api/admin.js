// Vercel serverless function: private moderation endpoint for GaneshaTracker.
// Uses the Supabase SERVICE ROLE key (server-side only, from env) so the public
// anon key can stay insert-only. Gated by a shared secret in the x-admin-secret
// header. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
//
// Required Vercel env vars:
//   ADMIN_SECRET               - a password you choose
//   SUPABASE_SERVICE_ROLE_KEY  - from Supabase - Project Settings - API
//   SUPABASE_URL               - optional; defaults to the project URL below
//
// POST /api/admin  with header x-admin-secret: <ADMIN_SECRET>
//   { "action": "list" }
//   { "action": "update", "id": "<uuid>", "fields": { ... } }
//   { "action": "delete", "id": "<uuid>" }

const SB_URL = process.env.SUPABASE_URL || "https://llyflyapfdrwgsvjjarl.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

const FIELDS = ["name", "area", "type", "lat", "lng", "about", "timings", "organiser", "visarjan", "access", "social", "added_by", "photo_url", "verified", "events"];
const TYPES = ["Community", "Temple", "Apartment", "Other"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (!SERVICE_KEY || !ADMIN_SECRET) return res.status(500).json({ error: "server not configured (missing ADMIN_SECRET or SUPABASE_SERVICE_ROLE_KEY)" });

  const given = String(req.headers["x-admin-secret"] || "");
  if (!safeEqual(given, ADMIN_SECRET)) return res.status(401).json({ error: "unauthorized" });

  let body;
  try { body = await readJson(req); } catch { return res.status(400).json({ error: "bad json body" }); }
  const action = body && body.action;

  const H = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };

  try {
    if (action === "list") {
      const r = await fetch(`${SB_URL}/rest/v1/ganeshas?select=*&order=created_at.desc`, { headers: H });
      const data = await r.json();
      return res.status(r.ok ? 200 : 502).json(data);
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!isUuid(id)) return res.status(400).json({ error: "bad id" });
      const patch = {};
      for (const k of FIELDS) if (body.fields && Object.prototype.hasOwnProperty.call(body.fields, k)) patch[k] = body.fields[k];
      if (patch.type != null && !TYPES.includes(patch.type)) return res.status(400).json({ error: "bad type" });
      if (patch.lat != null) { patch.lat = Number(patch.lat); if (!isFinite(patch.lat)) return res.status(400).json({ error: "bad lat" }); }
      if (patch.lng != null) { patch.lng = Number(patch.lng); if (!isFinite(patch.lng)) return res.status(400).json({ error: "bad lng" }); }
      if (patch.verified != null) patch.verified = !!patch.verified;
      if (!Object.keys(patch).length) return res.status(400).json({ error: "no fields" });
      const r = await fetch(`${SB_URL}/rest/v1/ganeshas?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(patch)
      });
      const data = await r.json();
      if (!r.ok) return res.status(502).json(data);
      if (!Array.isArray(data) || !data.length) return res.status(404).json({ error: "not found" });
      return res.status(200).json(data[0]);
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!isUuid(id)) return res.status(400).json({ error: "bad id" });
      const r = await fetch(`${SB_URL}/rest/v1/ganeshas?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE", headers: { ...H, Prefer: "return=representation" }
      });
      const data = await r.json();
      if (!r.ok) return res.status(502).json(data);
      return res.status(200).json({ deleted: Array.isArray(data) ? data.length : 0 });
    }

    return res.status(400).json({ error: "unknown action" });
  } catch (e) {
    return res.status(502).json({ error: "supabase request failed" });
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    let raw = "";
    req.on("data", c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
function isUuid(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
