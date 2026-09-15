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

const typeMarks = { Community: "✿", Temple: "♜", Apartment: "▦", Other: "◆" };
const app = document.querySelector("#app");
let map;
let formMap;
let markers = [];
let state = { query: "", type: "All pandals", sort: "Most loved", selected: 0 };

function storedPandals() {
  return JSON.parse(localStorage.getItem("mysuru-pandals") || "[]");
}

function pandals() {
  return [...defaults, ...storedPandals()];
}

function likedIds() {
  return new Set(JSON.parse(localStorage.getItem("mysuru-favourites") || "[]"));
}

function saveLikes(ids) {
  localStorage.setItem("mysuru-favourites", JSON.stringify([...ids]));
}

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

function navigate(path) {
  history.pushState(null, "", path);
  render();
}

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
        <div class="eyebrow">${title.eyebrow}</div>
        <h1>${title.headline}</h1>
        <p class="lede">${subtitle}</p>
      </div>
      <aside class="city-note">
        <div class="spark">✳</div>
        <p>Many neighbourhoods.<br><strong>One beautiful celebration.</strong></p>
        <div class="script">Namma Mysuru ♡</div>
      </aside>
    </section>${body}`;
}

function renderHome() {
  shell(
    { eyebrow: "GANESH CHATURTHI · 2026", headline: "A royal city full of <span>Bappa.</span>" },
    "Find a pandal. Feel the celebration. Be part of it.",
    `<section class="filters">
      <input class="search" id="search" placeholder="Try Kuvempunagar, Devaraja Market, Gokulam..." value="${state.query}">
      <div class="chips">${["All pandals", "Community", "Temple", "Apartment", "Other"].map(type => `<button class="chip ${state.type === type ? "active" : ""}" data-type="${type}">${typeMarks[type] || ""} ${type}</button>`).join("")}</div>
    </section>
    <section class="explorer">
      <aside class="panel">
        <div class="panel-head"><strong>${filtered().length}</strong> pandals to discover <select id="sort" aria-label="Sort pandals"><option>Most loved</option><option>Newest</option><option>Name A-Z</option></select></div>
        <div class="list" id="list"></div>
      </aside>
      <section class="map-wrap">
        <div id="map"></div>
        <div class="map-badge">NAMMA MYSURU&nbsp;&nbsp; 12.2958° N · 76.6394° E</div>
        <div class="map-tools"><button id="locate">Use my location</button><button id="showAll">Show all Mysuru</button></div>
        <div class="leader-pop" id="miniBoard"></div>
        <div class="legend"><span><i class="dot"></i>Community</span><span><i class="dot temple"></i>Temple</span><span><i class="dot apartment"></i>Apartment</span><span><i class="dot other"></i>Other</span></div>
      </section>
    </section>
    ${stats()}`
  );
  document.querySelector("#sort").value = state.sort;
  document.querySelector("#search").addEventListener("input", e => { state.query = e.target.value; renderList(); renderMap(); });
  document.querySelector("#sort").addEventListener("change", e => { state.sort = e.target.value; renderList(); renderMap(); });
  document.querySelectorAll("[data-type]").forEach(btn => btn.addEventListener("click", () => { state.type = btn.dataset.type; renderHome(); }));
  document.querySelector("#locate").addEventListener("click", () => navigator.geolocation && navigator.geolocation.getCurrentPosition(pos => map.setView([pos.coords.latitude, pos.coords.longitude], 14)));
  document.querySelector("#showAll").addEventListener("click", fitMysuru);
  renderList();
  renderMap();
}

function renderList() {
  const rows = filtered();
  document.querySelector("#list").innerHTML = rows.length ? rows.map(card).join("") : `<p class="empty">No pandals match that search yet.</p>`;
  document.querySelectorAll("[data-select]").forEach(btn => btn.addEventListener("click", () => selectPandal(Number(btn.dataset.select))));
  document.querySelectorAll("[data-like]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const ids = likedIds();
    const id = Number(btn.dataset.like);
    ids.has(id) ? ids.delete(id) : ids.add(id);
    saveLikes(ids);
    renderList();
    renderMiniBoard();
    document.querySelector(".stats")?.replaceWith(statsNode());
  }));
}

function card(p) {
  return `<article class="card ${state.selected === p.id ? "selected" : ""}">
    <button class="photo" data-select="${p.id}" aria-label="View ${p.name}"><span class="tag">${typeMarks[p.type]} ${p.type}</span></button>
    <div class="card-body">
      <div class="locality">⌖ ${p.area}</div>
      <h3>${p.name}</h3>
      <div class="card-foot"><span>${p.status}</span><button class="heart" data-like="${p.id}" aria-label="Favourite ${p.name}">${p.liked ? "♥" : "♡"} ${p.likes}</button></div>
    </div>
  </article>`;
}

function renderMap() {
  if (map) map.remove();
  map = L.map("map", { scrollWheelZoom: false }).setView(center, 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
  markers = filtered().map(p => L.marker([p.lat, p.lng], { icon: pinIcon(p) }).addTo(map).bindPopup(`<strong>${p.name}</strong><br>${p.area}`).on("click", () => selectPandal(p.id)));
  renderMiniBoard();
}

function pinIcon(p) {
  const color = p.type === "Temple" ? "#c2943d" : p.type === "Apartment" ? "#4e7567" : p.type === "Other" ? "#9b5061" : "#ac4f35";
  return L.divIcon({ className: "", html: `<div class="pin" style="background:${color}"><span>${typeMarks[p.type]}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34] });
}

function selectPandal(id) {
  state.selected = id;
  const p = withLikes().find(row => row.id === id);
  if (p && map) map.setView([p.lat, p.lng], 14);
  renderList();
}

function fitMysuru() {
  if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(.18));
}

function topRows(limit = 3) {
  return withLikes().sort((a, b) => b.likes - a.likes || a.name.localeCompare(b.name)).slice(0, limit);
}

function renderMiniBoard() {
  const board = document.querySelector("#miniBoard");
  if (!board) return;
  board.innerHTML = `<h2>A little local love</h2>${topRows().map((p, i) => `<button class="mini-row" data-select="${p.id}"><span>${String(i + 1).padStart(2, "0")}</span><span><strong>${p.name}</strong><small>${p.area}</small></span><span>♡ ${p.likes}</span></button>`).join("")}<a href="/leaderboard/" data-route>All community favourites ↗</a>`;
  board.querySelectorAll("[data-select]").forEach(btn => btn.addEventListener("click", () => selectPandal(Number(btn.dataset.select))));
}

function stats() {
  const total = withLikes().reduce((sum, p) => sum + p.likes, 0);
  return `<div class="stats"><span><i class="dot apartment"></i>A little community. A lot of Bappa.</span><span><strong>${pandals().length}</strong> pandals on the map</span><span><strong>1,108</strong> page views</span><a href="/leaderboard/" data-route><strong>${total}</strong> community favourites ↗</a></div>`;
}

function statsNode() {
  const wrap = document.createElement("div");
  wrap.innerHTML = stats();
  return wrap.firstElementChild;
}

function renderLeaderboard() {
  shell(
    { eyebrow: "THE COMMUNITY'S PICKS · 2026", headline: "A whole lot of <span>local love.</span>" },
    "Different neighbourhoods. The same love for Bappa.",
    `<section class="page leader-page">
      ${topRows(50).map((p, index) => `<div class="rank-row"><span class="rank-num">${String(index + 1).padStart(2, "0")}</span><span><strong>${p.name}</strong><small>${p.area} · ${p.type}</small></span><span>♡ ${p.likes}</span></div>`).join("")}
      <p><a class="primary" href="/" data-route>Explore all pandals</a></p>
    </section>${stats()}`
  );
}

function renderAdd() {
  app.innerHTML = `<section class="page">
    <a class="back" href="/" data-route>← Back to the map</a>
    <p class="eyebrow">BUILT BY THE COMMUNITY</p>
    <h1>Put your Bappa on the map.</h1>
    <p class="lede">A neighbourhood celebration deserves to be found.</p>
    <form id="pandalForm">
      <section class="form-section"><h2><span class="num">01</span>The pandal</h2>
        <div class="grid-2"><label>Pandal name *<input required name="name" placeholder="e.g. Devaraja Market Ganesha"></label><label>Neighbourhood *<input required name="area" placeholder="e.g. Kuvempunagar"></label></div>
        <label>Type of pandal *<select name="type"><option>Community</option><option>Temple</option><option>Apartment</option><option>Other</option></select></label>
        <label>A little about this pandal <span class="helper">Optional</span><textarea name="about" placeholder="The idol, the decorations, the people behind it..."></textarea></label>
        <div class="upload">📷<strong>Add a pandal photo</strong><span>Take a photo or choose from your gallery</span><small>JPG, PNG, WebP or HEIC · Phone photos are fine</small></div>
      </section>
      <section class="form-section"><h2><span class="num">02</span>Where to find Bappa</h2>
        <div class="grid-2"><label>Latitude *<input required name="lat" type="number" step="0.0001" value="12.2958"></label><label>Longitude *<input required name="lng" type="number" step="0.0001" value="76.6394"></label></div>
        <div id="formMap"></div>
        <label class="checks"><input required type="checkbox"> I confirm this pin marks the pandal's exact location.</label>
      </section>
      <section class="form-section"><h2><span class="num">03</span>The celebration</h2>
        <label>Pooja timings <span class="helper">Optional</span><input name="timings" placeholder="e.g. Morning aarti 8 AM, evening aarti 7 PM"></label>
        <div class="grid-2"><label>Visarjan date <span class="helper">Optional</span><input type="date" name="visarjan"></label><label>Organiser / community <span class="helper">Optional</span><input name="organiser" placeholder="Community or organiser name"></label></div>
        <label>Visitor access <span class="helper">Optional</span><select name="access"><option>Not confirmed</option><option>Open to visitors</option><option>Residents / private access</option></select></label>
      </section>
      <label class="checks"><input required type="checkbox"> I have permission to share this public location.</label>
      <div class="actions"><button class="primary" type="submit">Add my pandal</button></div>
    </form>
  </section>`;
  formMap = L.map("formMap", { scrollWheelZoom: false }).setView(center, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(formMap);
  const marker = L.marker(center, { draggable: true, icon: pinIcon({ type: "Community" }) }).addTo(formMap);
  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    document.querySelector("[name=lat]").value = pos.lat.toFixed(5);
    document.querySelector("[name=lng]").value = pos.lng.toFixed(5);
  });
  document.querySelector("#pandalForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const saved = storedPandals();
    saved.push({ id: Date.now(), name: data.name, area: data.area, type: data.type, likes: 0, lat: Number(data.lat), lng: Number(data.lng), status: "Pending verification" });
    localStorage.setItem("mysuru-pandals", JSON.stringify(saved));
    navigate("/");
  });
}

function render() {
  document.querySelectorAll("[data-nav]").forEach(a => {
    const active = a.dataset.nav === "home" ? location.pathname === "/" : location.pathname.startsWith(`/${a.dataset.nav}`);
    a.classList.toggle("active", active);
  });
  if (map) { map.remove(); map = null; }
  if (formMap) { formMap.remove(); formMap = null; }
  if (location.pathname.startsWith("/add")) renderAdd();
  else if (location.pathname.startsWith("/leaderboard")) renderLeaderboard();
  else renderHome();
}

render();
