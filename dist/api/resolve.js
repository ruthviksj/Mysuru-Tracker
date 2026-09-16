// Vercel serverless function: resolve a Google Maps link to latitude/longitude.
// Handles short links (maps.app.goo.gl / goo.gl) and social redirect wrappers
// (l.instagram.com, l.facebook.com, etc.) that people paste from Instagram bios.
// Called by the frontend as /api/resolve?url=<link>. Same-origin, so no CORS.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HDRS = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" };

module.exports = async (req, res) => {
  let url = (req.query && req.query.url ? String(req.query.url) : "").trim();
  if (!url) return res.status(400).json({ error: "no url" });

  // Peel social/redirect wrappers first (Instagram/Facebook link shims, Google url?q=).
  url = unwrap(url);

  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return res.status(400).json({ error: "bad url" }); }
  if (!allowedHost(host)) return res.status(400).json({ error: "unsupported host" });

  try {
    // A wrapper URL may already carry the coordinates in its query string.
    let coords = extract(url) || extract(safeDecode(url));
    if (!coords) coords = await resolveChain(url);
    if (coords) return res.status(200).json(coords);
    return res.status(404).json({ error: "no coords" });
  } catch (e) {
    return res.status(502).json({ error: "fetch failed" });
  }
};

// ---- host allow-list (SSRF guard) ----
function allowedHost(host) {
  return /(^|\.)google\.[a-z.]+$/.test(host) ||
    host === "maps.app.goo.gl" || host === "goo.gl" || host === "app.goo.gl" ||
    host === "maps.google.com" || host.endsWith(".g.co") || host === "g.co";
}

// ---- unwrap link shims to the real destination ----
// l.instagram.com/?u=<enc>, l.facebook.com/l.php?u=<enc>, google.com/url?q=<enc>, etc.
function unwrap(u) {
  for (let i = 0; i < 3; i++) {
    let parsed;
    try { parsed = new URL(u); } catch { return u; }
    const host = parsed.hostname.toLowerCase();
    const isShim =
      host === "l.instagram.com" || host === "lm.instagram.com" ||
      host === "l.facebook.com" || host === "lm.facebook.com" ||
      host === "l.messenger.com" || host === "away.php" ||
      (/(^|\.)google\.[a-z.]+$/.test(host) && parsed.pathname === "/url");
    if (!isShim) return u;
    const inner = parsed.searchParams.get("u") || parsed.searchParams.get("url") || parsed.searchParams.get("q");
    if (!inner) return u;
    u = safeDecode(inner);
  }
  return u;
}

// ---- follow the redirect chain and mine every hop for coordinates ----
async function resolveChain(startUrl) {
  let current = startUrl;
  const seen = new Set();
  for (let hop = 0; hop < 8; hop++) {
    if (!current || seen.has(current)) break;
    seen.add(current);

    // Try a manual redirect first so we can read the Location header (short
    // links expand to a URL that already contains @lat,lng or !3d!4d).
    let r;
    try {
      r = await fetchT(current, { redirect: "manual", headers: HDRS });
    } catch { break; }

    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) {
      const next = abs(loc, current);
      const c = extract(next) || extract(safeDecode(next));
      if (c) return c;
      current = next;
      continue;
    }

    // Not a redirect: read the body and mine it.
    let body = "";
    try { body = await r.text(); } catch {}
    const fromUrl = extract(r.url || current) || extract(safeDecode(r.url || current));
    if (fromUrl) return fromUrl;
    const fromBody = extract(body) || extract(safeDecode(body.slice(0, 400000)));
    if (fromBody) return fromBody;

    // Interstitial / consent page: chase the first Google Maps URL it names.
    const nextUrl = firstMapsUrl(body);
    if (nextUrl && !seen.has(nextUrl)) { current = nextUrl; continue; }
    break;
  }

  // Last resort: let fetch auto-follow and mine the final URL + body.
  try {
    const r = await fetchT(startUrl, { redirect: "follow", headers: HDRS });
    let body = "";
    try { body = await r.text(); } catch {}
    return extract(r.url || "") || extract(safeDecode(r.url || "")) ||
      extract(body) || extract(safeDecode(body.slice(0, 400000)));
  } catch { return null; }
}

function firstMapsUrl(s) {
  if (!s) return null;
  const m = s.match(/https?:\\?\/\\?\/[^"'\\\s<>]*google\.[a-z.]+\\?\/maps\\?\/[^"'\\\s<>]+/i);
  if (!m) return null;
  return m[0].replace(/\\\//g, "/").replace(/\\u003d/gi, "=").replace(/\\u0026/gi, "&").replace(/&amp;/g, "&");
}

function abs(loc, base) { try { return new URL(loc, base).href; } catch { return loc; } }

function fetchT(url, opts, ms = 7000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return fetch(url, { ...opts, signal: ac.signal }).finally(() => clearTimeout(t));
}

function safeDecode(s) { try { return decodeURIComponent(s); } catch { return s; } }

function extract(s) {
  if (!s) return null;
  const pats = [
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,               // place pin (most precise)
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,                    // map centre
    /[?&](?:q|ll|sll|center|destination|daddr|saddr)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&]center=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)/i,
    /"(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)"/
  ];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = +m[1], lng = +m[2];
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) return { lat, lng };
    }
  }
  return null;
}
