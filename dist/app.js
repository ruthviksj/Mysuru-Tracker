const center = [12.2958, 76.6394];
const defaults = [
  ["Palace North Ganesha", "Mysore Palace North Gate", "Community", 23, 12.3074, 76.6552, "Community verified"],
  ["Devaraja Market Vinayaka", "Devaraja Market", "Community", 17, 12.3101, 76.6536, "Community verified"],
  ["Kuvempunagar Maha Ganapati", "Kuvempunagar", "Community", 14, 12.2861, 76.6218, "Community verified"],
  ["Chamundi Hill Vinayaka Seva", "Chamundi Hill Road", "Temple", 12, 12.2729, 76.6705, "Community verified"],
  ["Gokulam 3rd Stage Ganesha", "Gokulam", "Community", 10, 12.3342, 76.6251, "Community verified"],
  ["Vijayanagar 2nd Stage Bappa", "Vijayanagar", "Apartment", 8, 12.3348, 76.5969, "Community verified"],
  ["Saraswathipuram Friends Pandal", "Saraswathipuram", "Community", 7, 12.3021, 76.6268, "Community verified"],
  ["Jayalakshmipuram Ganeshotsava", "Jayalakshmipuram", "Community", 6, 12.3247, 76.6265, "Community verified"],
  ["Lakshmipuram Temple Ganesha", "Lakshmipuram", "Temple", 5, 12.3012, 76.6477, "Community verified"],
  ["Hebbal Layout Ganapati", "Hebbal Industrial Area", "Other", 4, 12.3565, 76.6078, "Pending verification"],
  ["Nazarbad Main Road Bappa", "Nazarbad", "Community", 3, 12.3051, 76.6655, "Pending verification"],
  ["Bogadi Road Ganesha", "Bogadi", "Apartment", 2, 12.3129, 76.5882, "Community verified"]
].map((p, id) => ({ id, name: p[0], area: p[1], type: p[2], likes: p[3], lat: p[4], lng: p[5], status: p[6] }));

const typeMarks = { "All pandals": "◎", Community: "✿", Temple: "♜", Apartment: "▦", Other: "◆" };
const app = document.querySelector("#app");
let map;
let formMap;
let markers = [];
let state = { query: "", type: "All pandals", sort: "Most loved", selected: null };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function storedPandals() {
  try { return JSON.parse(localStorage.getItem("mysuru-pandals") || "[]"); } catch { return []; }
}
function pandals() { return [...defaults, ...storedPandals()]; }
function likedIds() {
  try { return new Set(JSON.parse(localStorage.getItem("mysuru-favourites") || "[]")); } catch { return new Set(); }
}
function saveLikes(ids) { localStorage.setItem("mysuru-favourites", JSON.stringify([...ids])); }
function withLikes() {
  const liked = likedIds();
  return pandals().map(p => ({ ...p, likes: p.likes + (liked.has(p.id) ? 1 : 0), liked: liked.has(p.id) }));
}
function filtered() {
  const q = state.query.toLowerCase().trim();
  let rows = withLikes().filter(p => (state.type === "All pandals" || p.type === state.type) && (!q || `${p.name} ${p.area}`.toLowerCase().includes(q)));
  if (state.sort === "Newest") rows = rows.reverse();
  if (state.sort === "Name A-Z") rows = rows.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === "Most loved") rows = rows.sort((a, b) => b.likes - a.likes || a.name.localeCompare(b.name));
  return rows;
}
function topRows(limit = 3) {
  return withLikes().sort((a, b) => b.likes - a.likes || a.name.localeCompare(b.name)).slice(0, limit);
}

function navigate(path) { history.pushState(null, "", path); render(); }
document.addEventListener("click", event => {
  const link = event.target.closest("[data-route]");
  if (!link) return;
  event.preventDefault();
  navigate(link.getAttribute("href"));
});
window.addEventListener("popstate", render);

function shell(title, subtitle, body) {
  app.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">${esc(title.eyebrow)}</div>
        <h1>${title.headline}</h1>
        <p class="lede">${esc(subtitle)}</p>
      </div>
      <aside class="city-note">
        <div class="cn-title">Namma Mysuru,<br>Namma Ganesha <span aria-hidden="true">♡</span></div>
      </aside>
    </section>${body}`;
}

function renderHome() {
  shell(
    { eyebrow: "Ganesh Chaturthi · 2026", headline: 'A royal city full of <span>Bappa.</span>' },
    "Find a pandal. Feel the celebration. Be part of it.",
    `<section class="filters">
      <div class="search-wrap">
        <input class="search" id="search" placeholder="Try Kuvempunagar, Devaraja Market, Gokulam..." value="${esc(state.query)}" aria-label="Search pandals">
      </div>
      <div class="chips">${["All pandals", "Community", "Temple", "Apartment", "Other"].map(type => `<button class="chip ${state.type === type ? "active" : ""}" data-type="${type}">${typeMarks[type] || ""} ${type}</button>`).join("")}</div>
    </section>
    <section class="explorer">
      <aside class="panel">
        <div class="panel-head"><span><strong>${filtered().length}</strong> pandals to discover</span>
          <label class="sort"><span class="sort-label">Sort</span><select id="sort" aria-label="Sort pandals"><option>Most loved</option><option>Newest</option><option>Name A-Z</option></select></label></div>
        <div class="list" id="list"></div>
      </aside>
      <section class="map-wrap">
        <div id="map"></div>
        <div class="map-badge">Namma Mysuru · 12.2958° N, 76.6394° E</div>
        <div class="map-tools"><button id="locate">Use my location</button><button id="showAll">Show all Mysuru</button></div>
        <div class="legend"><span><i class="dot"></i>Community</span><span><i class="dot temple"></i>Temple</span><span><i class="dot apartment"></i>Apartment</span><span><i class="dot other"></i>Other</span></div>
        <aside class="detail" id="detail" hidden></aside>
      </section>
    </section>
    <section class="loved" id="loved"></section>
    ${stats()}`
  );
  document.querySelector("#sort").value = state.sort;
  document.querySelector("#search").addEventListener("input", e => { state.query = e.target.value; renderList(); refreshMarkers(); });
  document.querySelector("#sort").addEventListener("change", e => { state.sort = e.target.value; renderList(); refreshMarkers(); });
  document.querySelectorAll("[data-type]").forEach(btn => btn.addEventListener("click", () => { state.type = btn.dataset.type; renderHome(); }));
  document.querySelector("#locate").addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => map.setView([pos.coords.latitude, pos.coords.longitude], 14));
  });
  document.querySelector("#showAll").addEventListener("click", fitMysuru);
  renderList();
  renderMap();
  renderLoved();
}

function renderList() {
  const rows = filtered();
  document.querySelector("#list").innerHTML = rows.length ? rows.map(card).join("") : `<p class="empty">No pandals match that search yet. Try another neighbourhood.</p>`;
  document.querySelectorAll("[data-select]").forEach(btn => btn.addEventListener("click", () => selectPandal(Number(btn.dataset.select))));
  document.querySelectorAll("[data-like]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    toggleLike(Number(btn.dataset.like));
    renderList();
    renderLoved();
    refreshMarkers();
    const s = document.querySelector(".stats");
    if (s) s.replaceWith(statsNode());
  }));
}

function toggleLike(id) {
  const ids = likedIds();
  ids.has(id) ? ids.delete(id) : ids.add(id);
  saveLikes(ids);
}

function card(p) {
  const pending = p.status !== "Community verified";
  const photoStyle = p.photo ? ` style="background-image:url('${p.photo}');background-size:cover;background-position:center"` : "";
  return `<article class="card ${state.selected === p.id ? "selected" : ""}">
    <button class="photo${p.photo ? " has-photo" : ""}" data-select="${p.id}"${photoStyle} aria-label="Focus ${esc(p.name)} on the map"><span class="tag">${typeMarks[p.type]} ${p.type}</span></button>
    <div class="card-body">
      <div class="locality">${esc(p.area)}</div>
      <h3>${esc(p.name)}</h3>
      <div class="card-foot">
        <span class="status ${pending ? "pending" : ""}">${esc(p.status)}</span>
        <button class="heart ${p.liked ? "on" : ""}" data-like="${p.id}" aria-pressed="${p.liked}" aria-label="Favourite ${esc(p.name)}">${p.liked ? "♥" : "♡"} ${p.likes}</button>
      </div>
    </div>
  </article>`;
}

function renderMap() {
  if (typeof L === "undefined") { const el = document.querySelector("#map"); if (el) el.innerHTML = `<div class="empty" style="margin:16px">The map could not load. Please check your connection and refresh.</div>`; return; }
  if (map) map.remove();
  map = L.map("map", {
    scrollWheelZoom: true,
    zoomControl: true,
    doubleClickZoom: true,
    minZoom: 10,
    maxZoom: 18
  }).setView(center, 12);
  map.zoomControl.setPosition("topright");
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
  refreshMarkers();
}

function refreshMarkers() {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m));
  markers = filtered().map(p => {
    const m = L.marker([p.lat, p.lng], { icon: pinIcon(p, state.selected === p.id) }).addTo(map);
    m.on("click", () => selectPandal(p.id, true));
    return m;
  });
}

function pinIcon(p, active = false) {
  const color = p.type === "Temple" ? "#cf9a2e" : p.type === "Apartment" ? "#3f6b5a" : p.type === "Other" ? "#97455a" : "#a83c22";
  return L.divIcon({ className: "pin-wrap", html: `<div class="pin${active ? " active" : ""}" style="background:${color}"><span>${typeMarks[p.type]}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32] });
}

function pandalRank(id) {
  const sorted = withLikes().sort((a, b) => b.likes - a.likes || a.name.localeCompare(b.name));
  return sorted.findIndex(p => p.id === id) + 1;
}

function selectPandal(id, recenter = true) {
  state.selected = id;
  const p = withLikes().find(row => row.id === id);
  if (p && map && recenter) map.setView([p.lat, p.lng], 16);
  renderList();
  refreshMarkers();
  renderDetail(id);
  const el = document.querySelector(".card.selected");
  if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function renderDetail(id) {
  const el = document.querySelector("#detail");
  const p = withLikes().find(row => row.id === id);
  if (!el || !p) return;
  const pending = p.status !== "Community verified";
  const rank = pandalRank(id);
  const photoStyle = p.photo ? ` style="background-image:url('${p.photo}')"` : "";
  const about = p.about ? esc(p.about) : `A neighbourhood Ganesha celebration in ${esc(p.area)}, Mysuru. More details coming soon.`;
  const events = (p.events || []).filter(e => e.name || e.date || e.time);
  el.innerHTML = `
    <button class="detail-close" id="detailClose" aria-label="Close details">✕</button>
    <div class="detail-photo${p.photo ? " has-photo" : ""}"${photoStyle}></div>
    <div class="detail-body">
      <div class="detail-tags"><span class="tag">${typeMarks[p.type]} ${p.type}</span><span class="status ${pending ? "pending" : ""}">${esc(p.status)}</span></div>
      <h2>${esc(p.name)}</h2>
      <div class="detail-loc">⌖ ${esc(p.area)}, Mysuru</div>
      <div class="detail-meta"><span class="rankline">◆ #${rank} community favourite</span><button class="heart ${p.liked ? "on" : ""}" data-like="${p.id}" aria-pressed="${p.liked}">${p.liked ? "♥" : "♡"} ${p.likes}</button></div>
      <p class="detail-about">${about}</p>
      ${p.timings ? `<div class="detail-block"><h3>Pooja timings</h3><p>${esc(p.timings)}</p></div>` : ""}
      ${events.length ? `<div class="detail-block"><h3>Events</h3>${events.map(e => `<div class="ev-item"><strong>${esc(e.name || "Event")}</strong><span>${[fmtDate(e.date), e.time].filter(Boolean).join(" · ") || "Timing to be confirmed"}</span></div>`).join("")}</div>` : ""}
      ${p.organiser ? `<div class="detail-block"><h3>Organiser</h3><p>${esc(p.organiser)}</p></div>` : ""}
      <div class="detail-actions"><a class="primary" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Get directions</a></div>
    </div>`;
  el.hidden = false;
  el.classList.add("open");
  el.scrollTop = 0;
  el.querySelector("#detailClose").addEventListener("click", closeDetail);
  const like = el.querySelector("[data-like]");
  if (like) like.addEventListener("click", e => {
    e.stopPropagation();
    toggleLike(id);
    renderList();
    renderLoved();
    refreshMarkers();
    renderDetail(id);
    const s = document.querySelector(".stats");
    if (s) s.replaceWith(statsNode());
  });
}

function closeDetail() {
  const el = document.querySelector("#detail");
  if (!el) return;
  el.hidden = true;
  el.classList.remove("open");
  el.innerHTML = "";
  state.selected = null;
  renderList();
  refreshMarkers();
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fitMysuru() {
  if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.18));
}

function renderLoved() {
  const wrap = document.querySelector("#loved");
  if (!wrap) return;
  const rows = topRows(3);
  wrap.innerHTML = `<div class="loved-head"><h2>A little local love</h2><a href="/leaderboard/" data-route>See all favourites ↗</a></div>
    <div class="loved-grid">${rows.map((p, i) => `<button class="loved-card" data-select="${p.id}"><span class="medal">${i + 1}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.area)}</small></span><span class="loved-likes">♡ ${p.likes}</span></button>`).join("")}</div>`;
  wrap.querySelectorAll("[data-select]").forEach(btn => btn.addEventListener("click", () => {
    selectPandal(Number(btn.dataset.select));
    document.querySelector(".map-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

function stats() {
  const total = withLikes().reduce((sum, p) => sum + p.likes, 0);
  return `<div class="stats">
    <span class="lead"><i class="dot apartment"></i>A little community. A lot of Bappa.</span>
    <span><strong>${pandals().length}</strong> pandals on the map</span>
    <span><strong>1,108</strong> page views</span>
    <a href="/leaderboard/" data-route><strong>${total}</strong> community favourites ↗</a>
  </div>`;
}
function statsNode() {
  const wrap = document.createElement("div");
  wrap.innerHTML = stats();
  return wrap.firstElementChild;
}

function renderLeaderboard() {
  shell(
    { eyebrow: "The community's picks · 2026", headline: 'A whole lot of <span>local love.</span>' },
    "Different neighbourhoods. The same love for Bappa.",
    `<section class="page leader-page">
      ${topRows(50).map((p, index) => `<div class="rank-row"><span class="rank-num">${index + 1}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.area)} · ${p.type}</small></span><span class="rank-likes">♡ ${p.likes}</span></div>`).join("")}
    </section>
    <div class="leader-cta"><a class="primary" href="/" data-route>Explore all pandals</a></div>`
  );
}

function renderAdd() {
  app.innerHTML = `<section class="page route">
    <a class="back" href="/" data-route>← Back to the map</a>
    <div class="eyebrow">Built by the community</div>
    <h1>Put your Bappa <span>on the map.</span></h1>
    <p class="lede">A neighbourhood celebration deserves to be found. It takes a minute.</p>
    <form id="pandalForm">
      <section class="form-section"><h2><span class="num">1</span>The pandal</h2>
        <div class="field-grid">
          <label>Pandal name *<input required name="name" placeholder="e.g. Devaraja Market Ganesha"></label>
          <label>Neighbourhood *<input required name="area" placeholder="e.g. Kuvempunagar"></label>
        </div>
        <label>Type of pandal *<select name="type"><option>Community</option><option>Temple</option><option>Apartment</option><option>Other</option></select></label>
        <label>A little about this pandal <span class="helper">Optional</span><textarea name="about" placeholder="The idol, the decorations, the people behind it..."></textarea></label>
        <div class="field">
          <span class="field-label">Add a pandal photo <span class="helper">Optional</span></span>
          <label class="upload" id="uploadZone">
            <input type="file" id="photoInput" accept="image/*" hidden>
            <span class="u-prompt"><span class="u-icon">📷</span><strong>Add a pandal photo</strong><span>Take a photo or choose from your gallery</span><small>JPG, PNG, WebP or HEIC · Phone photos are fine</small></span>
          </label>
          <button type="button" class="u-remove" id="photoRemove" hidden>Remove photo</button>
        </div>
      </section>
      <section class="form-section"><h2><span class="num">2</span>Where to find Bappa</h2>
        <div class="field">
          <span class="field-label">Google Maps link <span class="helper">Optional</span></span>
          <div class="linkrow">
            <input type="url" id="gmapsLink" placeholder="Paste a Google Maps link">
            <button type="button" class="ghost" id="findPin">Find pin</button>
          </div>
          <p class="link-hint">Paste a Google Maps link and we place the pin for you. Please confirm it on the map below.</p>
          <p class="link-status" id="linkStatus" role="status" hidden></p>
        </div>
        <p class="map-hint">📍 Or drag the pin to the exact spot, or type the coordinates.</p>
        <div id="formMap"></div>
        <div class="field-grid">
          <label>Latitude *<input required name="lat" type="number" step="0.0001" value="12.2958"></label>
          <label>Longitude *<input required name="lng" type="number" step="0.0001" value="76.6394"></label>
        </div>
        <label class="checks"><input required type="checkbox"><span>I confirm this pin marks the pandal's exact location.</span></label>
      </section>
      <section class="form-section"><h2><span class="num">3</span>The celebration</h2>
        <label>Pooja timings <span class="helper">Optional</span><input name="timings" placeholder="e.g. Morning aarti 8 AM, evening aarti 7 PM"></label>
        <div class="field">
          <span class="field-label">Events <span class="helper">Optional</span></span>
          <div id="eventList"></div>
          <button type="button" class="ghost add-event" id="addEvent">+ Add an event</button>
        </div>
        <div class="field-grid">
          <label>Visarjan date <span class="helper">Optional</span><input type="date" name="visarjan"></label>
          <label>Organiser / community <span class="helper">Optional</span><input name="organiser" placeholder="Community or organiser name"></label>
        </div>
        <label>Visitor access <span class="helper">Optional</span><select name="access"><option>Not confirmed</option><option>Open to visitors</option><option>Residents / private access</option></select></label>
        <label class="checks"><input required type="checkbox"><span>I have permission to share this public location.</span></label>
      </section>
      <div class="actions"><a class="ghost" href="/" data-route>Cancel</a><button class="primary" type="submit">Add my pandal</button></div>
    </form>
  </section>`;
  setupPhotoUpload();
  setupEvents();
  if (typeof L === "undefined") {
    const el = document.querySelector("#formMap");
    if (el) el.innerHTML = `<div class="empty" style="margin:16px">The map could not load. You can still enter coordinates above.</div>`;
  } else {
    formMap = L.map("formMap", { scrollWheelZoom: true, zoomControl: true, minZoom: 10, maxZoom: 18 }).setView(center, 13);
    formMap.zoomControl.setPosition("topright");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(formMap);
    formMarker = L.marker(center, { draggable: true, icon: pinIcon({ type: "Community" }) }).addTo(formMap);
    formMarker.on("dragend", () => syncLatLng(formMarker.getLatLng()));
    formMap.on("click", e => { formMarker.setLatLng(e.latlng); syncLatLng(e.latlng); });
  }
  setupFindPin();
  document.querySelector("#pandalForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const saved = storedPandals();
    saved.push({ id: Date.now(), name: data.name, area: data.area, type: data.type, likes: 0, lat: Number(data.lat), lng: Number(data.lng), status: "Pending verification", photo: photoData, about: (data.about || "").trim(), timings: (data.timings || "").trim(), organiser: (data.organiser || "").trim(), events: collectEvents() });
    try {
      localStorage.setItem("mysuru-pandals", JSON.stringify(saved));
    } catch (err) {
      // Storage full (usually the photo). Save without the image rather than losing the pandal.
      saved[saved.length - 1].photo = "";
      localStorage.setItem("mysuru-pandals", JSON.stringify(saved));
      alert("Your pandal was added, but the photo was too large to store on this device.");
    }
    navigate("/");
  });
}

let photoData = "";
function setupPhotoUpload() {
  photoData = "";
  const input = document.querySelector("#photoInput");
  const zone = document.querySelector("#uploadZone");
  const remove = document.querySelector("#photoRemove");
  if (!input || !zone) return;
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => downscale(reader.result, 1000, 0.82).then(dataUrl => {
      photoData = dataUrl;
      zone.classList.add("has-photo");
      zone.style.backgroundImage = `url("${dataUrl}")`;
      remove.hidden = false;
    });
    reader.readAsDataURL(file);
  });
  remove.addEventListener("click", () => {
    photoData = "";
    input.value = "";
    zone.classList.remove("has-photo");
    zone.style.backgroundImage = "";
    remove.hidden = true;
  });
}

function downscale(dataUrl, maxSize, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      try { resolve(canvas.toDataURL("image/jpeg", quality)); }
      catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

let formMarker = null;
function syncLatLng(pos) {
  const lat = document.querySelector("[name=lat]");
  const lng = document.querySelector("[name=lng]");
  if (lat) lat.value = pos.lat.toFixed(5);
  if (lng) lng.value = pos.lng.toFixed(5);
}
function setFormLocation(lat, lng) {
  syncLatLng({ lat, lng });
  if (formMap && formMarker) {
    formMarker.setLatLng([lat, lng]);
    formMap.setView([lat, lng], 16);
  }
}

// Pull "lat,lng" out of a pasted Google Maps URL (or raw coordinates).
function parseLatLng(text) {
  if (!text) return null;
  const s = text.trim();
  const pats = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&#](?:q|ll|sll|center|destination|daddr|saddr)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/
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

function setupFindPin() {
  const btn = document.querySelector("#findPin");
  const input = document.querySelector("#gmapsLink");
  const status = document.querySelector("#linkStatus");
  if (!btn || !input) return;
  const show = (msg, kind) => { status.textContent = msg; status.className = "link-status " + kind; status.hidden = false; };
  const run = () => {
    const val = input.value.trim();
    if (!val) { show("Paste a Google Maps link first.", "warn"); return; }
    const coords = parseLatLng(val);
    if (coords) {
      setFormLocation(coords.lat, coords.lng);
      show(`Pin placed at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}. Confirm it on the map.`, "ok");
    } else if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(val)) {
      show("Short links don't carry the coordinates. Open the link in Google Maps, then copy the full link from the address bar and paste it here.", "warn");
    } else {
      show("Couldn't find coordinates in that link. Paste the full Google Maps link, or type lat, lng below.", "warn");
    }
  };
  btn.addEventListener("click", run);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); run(); } });
}

function setupEvents() {
  const list = document.querySelector("#eventList");
  const add = document.querySelector("#addEvent");
  if (!list || !add) return;
  add.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `
      <input class="ev-name" placeholder="Event name (e.g. Maha Aarti)">
      <input type="date" class="ev-date" aria-label="Event date">
      <input type="time" class="ev-time" aria-label="Event time">
      <button type="button" class="ev-del" aria-label="Remove event">✕</button>`;
    row.querySelector(".ev-del").addEventListener("click", () => row.remove());
    list.appendChild(row);
    row.querySelector(".ev-name").focus();
  });
}
function collectEvents() {
  return [...document.querySelectorAll(".event-row")].map(r => ({
    name: r.querySelector(".ev-name").value.trim(),
    date: r.querySelector(".ev-date").value,
    time: r.querySelector(".ev-time").value
  })).filter(e => e.name || e.date || e.time);
}

function render() {
  document.querySelectorAll("[data-nav]").forEach(a => {
    const active = a.dataset.nav === "home" ? location.pathname === "/" : location.pathname.startsWith(`/${a.dataset.nav}`);
    a.classList.toggle("active", active);
  });
  if (map) { map.remove(); map = null; }
  if (formMap) { formMap.remove(); formMap = null; }
  markers = [];
  if (location.pathname.startsWith("/add")) renderAdd();
  else if (location.pathname.startsWith("/leaderboard")) renderLeaderboard();
  else renderHome();
  app.firstElementChild?.classList.add("route");
  window.scrollTo({ top: 0, behavior: "auto" });
}

render();
