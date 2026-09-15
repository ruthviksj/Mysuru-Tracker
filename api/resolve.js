// Vercel serverless function: resolve a Google Maps link (including short
// maps.app.goo.gl / goo.gl links) to latitude/longitude.
// Called by the frontend as /api/resolve?url=<link>. Same-origin, so no CORS.

module.exports = async (req, res) => {
  const url = (req.query && req.query.url ? String(req.query.url) : "").trim();
  if (!url) return res.status(400).json({ error: "no url" });

  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return res.status(400).json({ error: "bad url" }); }

  // SSRF guard: only follow Google Maps style links.
  const ok = /(^|\.)google\.[a-z.]+$/.test(host) || host === "maps.app.goo.gl" || host === "goo.gl" || host === "maps.google.com" || host.endsWith(".g.co") || host === "g.co";
  if (!ok) return res.status(400).json({ error: "unsupported host" });

  try {
    const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; GaneshaTracker/1.0)" } });
    let body = "";
    try { body = await r.text(); } catch (e) {}
    const finalUrl = r.url || url;
    const coords = extract(finalUrl) || extract(safeDecode(finalUrl)) || extract(body) || extract(safeDecode(body.slice(0, 300000)));
    if (coords) return res.status(200).json(coords);
    return res.status(404).json({ error: "no coords" });
  } catch (e) {
    return res.status(502).json({ error: "fetch failed" });
  }
};

function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

function extract(s) {
  if (!s) return null;
  const pats = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|sll|center|destination|daddr|saddr)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /"(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)"/
  ];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = +m[1], lng = +m[2];
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }
  }
  return null;
}
