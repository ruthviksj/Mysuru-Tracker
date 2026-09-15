const center = [12.2958, 76.6394];
const defaults = [
  ["Palace North Ganesha", "Mysore Palace North Gate", "Community", 23, 12.3074, 76.6552, "Community verified"],
  ["Devaraja Market Vinayaka", "Devaraja Market", "Community", 17, 12.3101, 76.6536, "Community verified"],
  ["Kuvempunagar Maha Ganapati", "Kuvempunagar", "Community", 14, 12.2861, 76.6218, "Community verified"],
  ["Chamundi Hill Vinayaka Seva", "Chamundi Hill Road", "Temple", 12, 12.2729, 76.6705, "Community verified"],
  ["Gokulam 3rd Stage Ganesha", "Gokulam", "Community", 10, 12.3342, 76.6251, "Community verified"],
  ["Vijayanagar 2nd Stage Bappa", "Vijayanagar", "Apartment", 8, 12.3348, 76.5969, "Community verified"],
  ["Saraswathipuram Friends Ganesha", "Saraswathipuram", "Community", 7, 12.3021, 76.6268, "Community verified"],
  ["Jayalakshmipuram Ganeshotsava", "Jayalakshmipuram", "Community", 6, 12.3247, 76.6265, "Community verified"],
  ["Lakshmipuram Temple Ganesha", "Lakshmipuram", "Temple", 5, 12.3012, 76.6477, "Community verified"],
  ["Hebbal Layout Ganapati", "Hebbal Industrial Area", "Other", 4, 12.3565, 76.6078, "Pending verification"],
  ["Nazarbad Main Road Bappa", "Nazarbad", "Community", 3, 12.3051, 76.6655, "Pending verification"],
  ["Bogadi Road Ganesha", "Bogadi", "Apartment", 2, 12.3129, 76.5882, "Community verified"]
].map((p, i) => ({ id: "seed" + i, name: p[0], area: p[1], type: p[2], likes: p[3], lat: p[4], lng: p[5], status: p[6] }));

/* ---------------- Supabase backend ---------------- */
const SB_URL = "https://llyflyapfdrwgsvjjarl.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxseWZseWFwZmRyd2dzdmpqYXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Njc5ODIsImV4cCI6MjEwNTA0Mzk4Mn0.mHr26JvA8p49zgG7XJIXV8RB2H64oNHrjIQuxVldqhY";
const SB_H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };
const SB_HJSON = { ...SB_H, "Content-Type": "application/json" };
let remote = null;   // null = not loaded / offline (fall back to seed); array once loaded
let pageViews = null;

function mapRow(r) {
  return {
    id: r.id, name: r.name, area: r.area, type: r.type, likes: r.likes || 0,
    lat: r.lat, lng: r.lng,
    status: r.verified ? "Community verified" : "Pending verification",
    photo: r.photo_url || "", about: r.about || "", timings: r.timings || "",
    organiser: r.organiser || "", visarjan: r.visarjan || "", access: r.access || "",
    social: r.social || "", events: Array.isArray(r.events) ? r.events : []
  };
}
async function loadGaneshas() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/ganeshas?select=*`, { headers: SB_H });
    if (!res.ok) throw new Error(res.status);
    remote = (await res.json()).map(mapRow);
  } catch (e) { remote = null; }
}
async function bumpPageViews() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/bump_pageviews`, { method: "POST", headers: SB_HJSON, body: "{}" });
    if (res.ok) { pageViews = await res.json(); const s = document.querySelector(".stats"); if (s) s.replaceWith(statsNode()); }
  } catch (e) {}
}
async function uploadPhoto(dataUrl) {
  const blob = dataURLtoBlob(dataUrl);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const res = await fetch(`${SB_URL}/storage/v1/object/ganesha-photos/${path}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: blob
  });
  if (!res.ok) throw new Error("upload failed");
  return `${SB_URL}/storage/v1/object/public/ganesha-photos/${path}`;
}
function dataURLtoBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/:(.*?);/) || [])[1] || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/* ---------------- i18n ---------------- */
let lang = "en";
try { lang = localStorage.getItem("mysuru-lang") || "en"; } catch {}

const STR = {
  en: {
    brand_tag: "MYSURU, TOGETHER.",
    nav_explore: "Explore Ganeshas",
    nav_favourites: "Community favourites",
    season: "Mysuru · 2026",
    nav_add: "+ Add a Ganesha",
    foot_made: "Made with ♡ for Mysuru.",
    foot_chant: "Ganapati Bappa Morya!",
    foot_modak: "Buy me some modaks",
    foot_owner: "Owner access",
    home_eyebrow: "Ganesh Chaturthi · 2026",
    home_headline: "A royal city full of <span>Bappa.</span>",
    home_lede: "Find a Ganesha. Feel the celebration. Be part of it.",
    cn_title: "Namma Mysuru,<br>Namma Ganesha <span aria-hidden=\"true\">♡</span>",
    search_ph: "Try Kuvempunagar, Devaraja Market, Gokulam...",
    search_aria: "Search Ganeshas",
    type_all: "All Ganeshas",
    type_Community: "Community",
    type_Temple: "Temple",
    type_Apartment: "Apartment",
    type_Other: "Other",
    sort_label: "Sort",
    sort_popular: "Most loved",
    sort_newest: "Newest",
    sort_az: "Name A-Z",
    show_all: "Show all Mysuru",
    empty_list: "No Ganeshas match that search yet. Try another neighbourhood.",
    map_fail: "The map could not load. Please check your connection and refresh.",
    status_verified: "Community verified",
    status_pending: "Pending verification",
    loved_head: "A little local love",
    see_all: "See all favourites ↗",
    stats_lead: "A little community. A lot of Bappa.",
    page_views: "page views",
    fav_suffix: "community favourites ↗",
    about_fallback: "A neighbourhood Ganesha celebration in {area}, Mysuru. More details coming soon.",
    info_visarjan: "Visarjan",
    info_timings: "Pooja timings",
    info_access: "Visitor access",
    info_organiser: "Organised by",
    whats_happening: "What's happening",
    event_none: "Event schedule not confirmed yet.",
    time_tbc: "Time to be confirmed",
    rank_suffix: "community favourite",
    act_directions: "⌖ Google Maps directions",
    act_follow: "Follow on {label}",
    act_osm: "View on OpenStreetMap ↗",
    act_share_wa: "Share on WhatsApp",
    detail_close: "Close details",
    toast_copied: "Ganesha link copied",
    leader_eyebrow: "The community's picks · 2026",
    leader_headline: "A whole lot of <span>local love.</span>",
    leader_lede: "Different neighbourhoods. The same love for Bappa.",
    leader_cta: "Explore all Ganeshas",
    back_map: "← Back to the map",
    add_eyebrow: "Built by the community",
    add_h1: "Put your Bappa <span>on the map.</span>",
    add_lede: "A neighbourhood celebration deserves to be found. It takes a minute.",
    sec1: "The Ganesha",
    sec2: "Where to find Bappa",
    sec3: "The celebration",
    optional: "Optional",
    f_name: "Ganesha name",
    f_name_ph: "e.g. Devaraja Market Ganesha",
    f_area: "Neighbourhood",
    f_area_ph: "e.g. Kuvempunagar",
    f_type: "Type of Ganesha",
    f_about: "A little about this Ganesha",
    f_about_ph: "The idol, the decorations, the people behind it...",
    f_photo: "Add a Ganesha photo",
    f_photo_sub: "Take a photo or choose from your gallery",
    f_photo_small: "JPG, PNG, WebP or HEIC · Phone photos are fine",
    f_photo_remove: "Remove photo",
    f_gmaps: "Google Maps link",
    f_gmaps_ph: "Paste a Google Maps link",
    f_findpin: "Find pin",
    f_gmaps_hint: "Paste a Google Maps link and we place the pin for you. Please confirm it on the map below.",
    f_map_hint: "📍 Or drag the pin to the exact spot, or type the coordinates.",
    f_lat: "Latitude",
    f_lng: "Longitude",
    f_confirm1: "I confirm this pin marks the Ganesha's exact location.",
    f_timings: "Pooja timings",
    f_timings_ph: "e.g. Morning aarti 8 AM, evening aarti 7 PM",
    f_events: "Events",
    f_add_event: "+ Add an event",
    f_event_name_ph: "Event name (e.g. Maha Aarti)",
    f_event_date: "Event date",
    f_event_time: "Event time",
    f_remove_event: "Remove event",
    f_visarjan: "Visarjan date",
    f_organiser: "Organiser / community",
    f_organiser_ph: "Community or organiser name",
    f_access: "Visitor access",
    opt_not_confirmed: "Not confirmed",
    opt_open: "Open to visitors",
    opt_private: "Residents / private access",
    f_social: "Instagram or social page",
    f_social_ph: "instagram.com/yourganesha, @handle, or any link",
    f_confirm2: "I have permission to share this public location.",
    f_cancel: "Cancel",
    f_submit: "Add my Ganesha",
    map_fail_add: "The map could not load. You can still enter coordinates above.",
    save_photo_big: "Your Ganesha was added, but the photo was too large to store on this device.",
    saving: "Saving…",
    submit_fail: "Sorry, that couldn't be saved. Please check your connection and try again.",
    fp_empty: "Paste a Google Maps link first.",
    fp_placed: "Pin placed at {lat}, {lng}. Confirm it on the map.",
    fp_short: "Short links don't carry the coordinates. Open the link in Google Maps, then copy the full link from the address bar and paste it here.",
    fp_none: "Couldn't find coordinates in that link. Paste the full Google Maps link, or type lat, lng below.",
    ctrl_locate: "Use my location",
    ctrl_full: "Toggle fullscreen",
    err_locate: "Couldn't get your location",
    err_full_na: "Fullscreen isn't available here",
    err_full_ns: "Fullscreen isn't supported in this browser",
    err_copy: "Couldn't copy. Copy it manually."
  },
  kn: {
    brand_tag: "ಮೈಸೂರು, ಒಟ್ಟಿಗೆ.",
    nav_explore: "ಗಣೇಶಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    nav_favourites: "ಸಮುದಾಯದ ಮೆಚ್ಚುಗೆಗಳು",
    season: "ಮೈಸೂರು · 2026",
    nav_add: "+ ಗಣೇಶನನ್ನು ಸೇರಿಸಿ",
    foot_made: "ಮೈಸೂರಿಗಾಗಿ ♡ ಇಂದ ಮಾಡಲಾಗಿದೆ.",
    foot_chant: "ಗಣಪತಿ ಬಪ್ಪಾ ಮೋರ್ಯಾ!",
    foot_modak: "ನನಗೆ ಕೆಲವು ಮೋದಕ ಕೊಡಿಸಿ",
    foot_owner: "ಮಾಲೀಕ ಪ್ರವೇಶ",
    home_eyebrow: "ಗಣೇಶ ಚತುರ್ಥಿ · 2026",
    home_headline: "<span>ಬಪ್ಪಾ</span> ತುಂಬಿದ ರಾಜನಗರಿ.",
    home_lede: "ಗಣೇಶನನ್ನು ಹುಡುಕಿ. ಸಂಭ್ರಮವನ್ನು ಅನುಭವಿಸಿ. ಭಾಗವಾಗಿ.",
    cn_title: "ನಮ್ಮ ಮೈಸೂರು,<br>ನಮ್ಮ ಗಣೇಶ <span aria-hidden=\"true\">♡</span>",
    search_ph: "ಕುವೆಂಪುನಗರ, ದೇವರಾಜ ಮಾರುಕಟ್ಟೆ, ಗೋಕುಲಂ ಪ್ರಯತ್ನಿಸಿ...",
    search_aria: "ಗಣೇಶಗಳನ್ನು ಹುಡುಕಿ",
    type_all: "ಎಲ್ಲಾ ಗಣೇಶಗಳು",
    type_Community: "ಸಮುದಾಯ",
    type_Temple: "ದೇವಸ್ಥಾನ",
    type_Apartment: "ಅಪಾರ್ಟ್‌ಮೆಂಟ್",
    type_Other: "ಇತರೆ",
    sort_label: "ವಿಂಗಡಿಸಿ",
    sort_popular: "ಹೆಚ್ಚು ಪ್ರೀತಿಸಲ್ಪಟ್ಟ",
    sort_newest: "ಹೊಸದು",
    sort_az: "ಹೆಸರು A-Z",
    show_all: "ಎಲ್ಲಾ ಮೈಸೂರು ತೋರಿಸಿ",
    empty_list: "ಆ ಹುಡುಕಾಟಕ್ಕೆ ಯಾವ ಗಣೇಶವೂ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ಬೇರೆ ಬಡಾವಣೆ ಪ್ರಯತ್ನಿಸಿ.",
    map_fail: "ನಕ್ಷೆ ಲೋಡ್ ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ರಿಫ್ರೆಶ್ ಮಾಡಿ.",
    status_verified: "ಸಮುದಾಯ ದೃಢೀಕೃತ",
    status_pending: "ಪರಿಶೀಲನೆ ಬಾಕಿ",
    loved_head: "ಸ್ವಲ್ಪ ಸ್ಥಳೀಯ ಪ್ರೀತಿ",
    see_all: "ಎಲ್ಲಾ ಮೆಚ್ಚುಗೆಗಳನ್ನು ನೋಡಿ ↗",
    stats_lead: "ಸ್ವಲ್ಪ ಸಮುದಾಯ. ಬಹಳಷ್ಟು ಬಪ್ಪಾ.",
    page_views: "ಪುಟ ವೀಕ್ಷಣೆಗಳು",
    fav_suffix: "ಸಮುದಾಯ ಮೆಚ್ಚುಗೆಗಳು ↗",
    about_fallback: "{area}, ಮೈಸೂರಿನ ಬಡಾವಣೆಯ ಗಣೇಶ ಸಂಭ್ರಮ. ಹೆಚ್ಚಿನ ವಿವರಗಳು ಶೀಘ್ರದಲ್ಲೇ.",
    info_visarjan: "ವಿಸರ್ಜನೆ",
    info_timings: "ಪೂಜಾ ಸಮಯ",
    info_access: "ಸಂದರ್ಶಕ ಪ್ರವೇಶ",
    info_organiser: "ಆಯೋಜಕರು",
    whats_happening: "ಏನು ನಡೆಯುತ್ತಿದೆ",
    event_none: "ಕಾರ್ಯಕ್ರಮದ ವೇಳಾಪಟ್ಟಿ ಇನ್ನೂ ದೃಢೀಕರಿಸಿಲ್ಲ.",
    time_tbc: "ಸಮಯ ದೃಢೀಕರಿಸಬೇಕಿದೆ",
    rank_suffix: "ಸಮುದಾಯ ಮೆಚ್ಚುಗೆ",
    act_directions: "⌖ ಗೂಗಲ್ ನಕ್ಷೆ ದಾರಿ",
    act_follow: "{label} ನಲ್ಲಿ ಫಾಲೋ ಮಾಡಿ",
    act_osm: "OpenStreetMap ನಲ್ಲಿ ನೋಡಿ ↗",
    act_share_wa: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ",
    detail_close: "ವಿವರಗಳನ್ನು ಮುಚ್ಚಿ",
    toast_copied: "ಗಣೇಶ ಲಿಂಕ್ ನಕಲಿಸಲಾಗಿದೆ",
    leader_eyebrow: "ಸಮುದಾಯದ ಆಯ್ಕೆಗಳು · 2026",
    leader_headline: "ಬಹಳಷ್ಟು <span>ಸ್ಥಳೀಯ ಪ್ರೀತಿ.</span>",
    leader_lede: "ಬೇರೆ ಬೇರೆ ಬಡಾವಣೆಗಳು. ಬಪ್ಪಾನ ಮೇಲೆ ಅದೇ ಪ್ರೀತಿ.",
    leader_cta: "ಎಲ್ಲಾ ಗಣೇಶಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    back_map: "← ನಕ್ಷೆಗೆ ಹಿಂತಿರುಗಿ",
    add_eyebrow: "ಸಮುದಾಯದಿಂದ ನಿರ್ಮಿತ",
    add_h1: "ನಿಮ್ಮ ಬಪ್ಪಾನನ್ನು <span>ನಕ್ಷೆಯಲ್ಲಿ ಹಾಕಿ.</span>",
    add_lede: "ಬಡಾವಣೆಯ ಸಂಭ್ರಮ ಕಂಡುಬರಬೇಕು. ಒಂದು ನಿಮಿಷ ಸಾಕು.",
    sec1: "ಗಣೇಶ",
    sec2: "ಬಪ್ಪಾನನ್ನು ಎಲ್ಲಿ ಹುಡುಕುವುದು",
    sec3: "ಸಂಭ್ರಮ",
    optional: "ಐಚ್ಛಿಕ",
    f_name: "ಗಣೇಶನ ಹೆಸರು",
    f_name_ph: "ಉದಾ. ದೇವರಾಜ ಮಾರುಕಟ್ಟೆ ಗಣೇಶ",
    f_area: "ಬಡಾವಣೆ",
    f_area_ph: "ಉದಾ. ಕುವೆಂಪುನಗರ",
    f_type: "ಗಣೇಶನ ಪ್ರಕಾರ",
    f_about: "ಈ ಗಣೇಶನ ಬಗ್ಗೆ ಸ್ವಲ್ಪ",
    f_about_ph: "ಮೂರ್ತಿ, ಅಲಂಕಾರ, ಹಿಂದಿನ ಜನರು...",
    f_photo: "ಗಣೇಶನ ಫೋಟೋ ಸೇರಿಸಿ",
    f_photo_sub: "ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಗ್ಯಾಲರಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ",
    f_photo_small: "JPG, PNG, WebP ಅಥವಾ HEIC · ಫೋನ್ ಫೋಟೋಗಳು ಸರಿ",
    f_photo_remove: "ಫೋಟೋ ತೆಗೆದುಹಾಕಿ",
    f_gmaps: "ಗೂಗಲ್ ನಕ್ಷೆ ಲಿಂಕ್",
    f_gmaps_ph: "ಗೂಗಲ್ ನಕ್ಷೆ ಲಿಂಕ್ ಅಂಟಿಸಿ",
    f_findpin: "ಪಿನ್ ಹುಡುಕಿ",
    f_gmaps_hint: "ಗೂಗಲ್ ನಕ್ಷೆ ಲಿಂಕ್ ಅಂಟಿಸಿ, ನಾವು ಪಿನ್ ಇಡುತ್ತೇವೆ. ದಯವಿಟ್ಟು ಕೆಳಗಿನ ನಕ್ಷೆಯಲ್ಲಿ ದೃಢೀಕರಿಸಿ.",
    f_map_hint: "📍 ಅಥವಾ ಪಿನ್ ಅನ್ನು ನಿಖರ ಸ್ಥಳಕ್ಕೆ ಎಳೆಯಿರಿ, ಅಥವಾ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    f_lat: "ಅಕ್ಷಾಂಶ",
    f_lng: "ರೇಖಾಂಶ",
    f_confirm1: "ಈ ಪಿನ್ ಗಣೇಶನ ನಿಖರ ಸ್ಥಳವನ್ನು ಗುರುತಿಸುತ್ತದೆ ಎಂದು ನಾನು ದೃಢೀಕರಿಸುತ್ತೇನೆ.",
    f_timings: "ಪೂಜಾ ಸಮಯ",
    f_timings_ph: "ಉದಾ. ಬೆಳಗಿನ ಆರತಿ 8 AM, ಸಂಜೆ ಆರತಿ 7 PM",
    f_events: "ಕಾರ್ಯಕ್ರಮಗಳು",
    f_add_event: "+ ಕಾರ್ಯಕ್ರಮ ಸೇರಿಸಿ",
    f_event_name_ph: "ಕಾರ್ಯಕ್ರಮದ ಹೆಸರು (ಉದಾ. ಮಹಾ ಆರತಿ)",
    f_event_date: "ಕಾರ್ಯಕ್ರಮದ ದಿನಾಂಕ",
    f_event_time: "ಕಾರ್ಯಕ್ರಮದ ಸಮಯ",
    f_remove_event: "ಕಾರ್ಯಕ್ರಮ ತೆಗೆದುಹಾಕಿ",
    f_visarjan: "ವಿಸರ್ಜನೆ ದಿನಾಂಕ",
    f_organiser: "ಆಯೋಜಕ / ಸಮುದಾಯ",
    f_organiser_ph: "ಸಮುದಾಯ ಅಥವಾ ಆಯೋಜಕರ ಹೆಸರು",
    f_access: "ಸಂದರ್ಶಕ ಪ್ರವೇಶ",
    opt_not_confirmed: "ದೃಢೀಕರಿಸಿಲ್ಲ",
    opt_open: "ಸಂದರ್ಶಕರಿಗೆ ಮುಕ್ತ",
    opt_private: "ನಿವಾಸಿಗಳು / ಖಾಸಗಿ ಪ್ರವೇಶ",
    f_social: "ಇನ್‌ಸ್ಟಾಗ್ರಾಂ ಅಥವಾ ಸಾಮಾಜಿಕ ಪುಟ",
    f_social_ph: "instagram.com/yourganesha, @handle, ಅಥವಾ ಯಾವುದೇ ಲಿಂಕ್",
    f_confirm2: "ಈ ಸಾರ್ವಜನಿಕ ಸ್ಥಳವನ್ನು ಹಂಚಿಕೊಳ್ಳಲು ನನಗೆ ಅನುಮತಿ ಇದೆ.",
    f_cancel: "ರದ್ದುಮಾಡಿ",
    f_submit: "ನನ್ನ ಗಣೇಶನನ್ನು ಸೇರಿಸಿ",
    map_fail_add: "ನಕ್ಷೆ ಲೋಡ್ ಆಗಲಿಲ್ಲ. ಮೇಲೆ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ನಮೂದಿಸಬಹುದು.",
    save_photo_big: "ನಿಮ್ಮ ಗಣೇಶನನ್ನು ಸೇರಿಸಲಾಗಿದೆ, ಆದರೆ ಫೋಟೋ ಈ ಸಾಧನದಲ್ಲಿ ಸಂಗ್ರಹಿಸಲು ತುಂಬಾ ದೊಡ್ಡದಾಗಿತ್ತು.",
    saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…",
    submit_fail: "ಕ್ಷಮಿಸಿ, ಅದನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    fp_empty: "ಮೊದಲು ಗೂಗಲ್ ನಕ್ಷೆ ಲಿಂಕ್ ಅಂಟಿಸಿ.",
    fp_placed: "ಪಿನ್ {lat}, {lng} ನಲ್ಲಿ ಇಡಲಾಗಿದೆ. ನಕ್ಷೆಯಲ್ಲಿ ದೃಢೀಕರಿಸಿ.",
    fp_short: "ಚಿಕ್ಕ ಲಿಂಕ್‌ಗಳಲ್ಲಿ ನಿರ್ದೇಶಾಂಕಗಳಿರುವುದಿಲ್ಲ. ಲಿಂಕ್ ಅನ್ನು ಗೂಗಲ್ ನಕ್ಷೆಯಲ್ಲಿ ತೆರೆದು, ವಿಳಾಸ ಪಟ್ಟಿಯಿಂದ ಪೂರ್ಣ ಲಿಂಕ್ ಅನ್ನು ನಕಲಿಸಿ ಇಲ್ಲಿ ಅಂಟಿಸಿ.",
    fp_none: "ಆ ಲಿಂಕ್‌ನಲ್ಲಿ ನಿರ್ದೇಶಾಂಕ ಸಿಗಲಿಲ್ಲ. ಪೂರ್ಣ ಗೂಗಲ್ ನಕ್ಷೆ ಲಿಂಕ್ ಅಂಟಿಸಿ, ಅಥವಾ ಕೆಳಗೆ ಅಕ್ಷಾಂಶ, ರೇಖಾಂಶ ಟೈಪ್ ಮಾಡಿ.",
    ctrl_locate: "ನನ್ನ ಸ್ಥಳ ಬಳಸಿ",
    ctrl_full: "ಪೂರ್ಣಪರದೆ ಬದಲಿಸಿ",
    err_locate: "ನಿಮ್ಮ ಸ್ಥಳ ಪಡೆಯಲಾಗಲಿಲ್ಲ",
    err_full_na: "ಇಲ್ಲಿ ಪೂರ್ಣಪರದೆ ಲಭ್ಯವಿಲ್ಲ",
    err_full_ns: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಪೂರ್ಣಪರದೆ ಬೆಂಬಲವಿಲ್ಲ",
    err_copy: "ನಕಲಿಸಲಾಗಲಿಲ್ಲ. ಕೈಯಿಂದ ನಕಲಿಸಿ."
  }
};

function t(k) { return (STR[lang] && STR[lang][k]) || STR.en[k] || k; }
function tf(k, vars) { return t(k).replace(/\{(\w+)\}/g, (_, n) => (vars[n] != null ? vars[n] : "")); }
function typeLabel(v) { return t(v === "all" ? "type_all" : "type_" + v); }
function statusLabel(s) { return s === "Community verified" ? t("status_verified") : t("status_pending"); }

/* count / mixed phrases with a bolded number */
function nDiscover(n) { return lang === "kn" ? `ಅನ್ವೇಷಿಸಲು <strong>${n}</strong> ಗಣೇಶಗಳು` : `<strong>${n}</strong> Ganeshas to discover`; }
function nOnMap(n) { return lang === "kn" ? `ನಕ್ಷೆಯಲ್ಲಿ <strong>${n}</strong> ಗಣೇಶಗಳು` : `<strong>${n}</strong> Ganeshas on the map`; }
function nRank(n) { return `◆ #${n} ${t("rank_suffix")}`; }
function nShare(n) {
  if (lang === "kn") return `${n} ವಾಟ್ಸಾಪ್ ಹಂಚಿಕೆ ಟ್ಯಾಪ್`;
  return `${n} WhatsApp share-button tap${n === 1 ? "" : "s"}`;
}

const typeMarks = { all: "◎", Community: "✿", Temple: "♜", Apartment: "▦", Other: "◆" };
const app = document.querySelector("#app");
let map;
let formMap;
let markers = [];
let cluster = null;
let state = { query: "", type: "all", sort: "popular", selected: null };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function pandals() { return remote === null ? defaults : remote; }
function likedIds() {
  try { return new Set(JSON.parse(localStorage.getItem("mysuru-favourites") || "[]")); } catch { return new Set(); }
}
function saveLikes(ids) { localStorage.setItem("mysuru-favourites", JSON.stringify([...ids])); }
function shareCounts() {
  try { return JSON.parse(localStorage.getItem("mysuru-share-counts") || "{}"); } catch { return {}; }
}
function bumpShare(id) {
  const c = shareCounts();
  c[id] = (c[id] || 0) + 1;
  try { localStorage.setItem("mysuru-share-counts", JSON.stringify(c)); } catch {}
  return c[id];
}
function withLikes() {
  const liked = likedIds();
  return pandals().map(p => ({ ...p, liked: liked.has(p.id) }));
}
function filtered() {
  const q = state.query.toLowerCase().trim();
  let rows = withLikes().filter(p => (state.type === "all" || p.type === state.type) && (!q || `${p.name} ${p.area}`.toLowerCase().includes(q)));
  if (state.sort === "newest") rows = rows.reverse();
  if (state.sort === "az") rows = rows.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === "popular") rows = rows.sort((a, b) => b.likes - a.likes || a.name.localeCompare(b.name));
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

function shell(eyebrow, headline, subtitle, body) {
  app.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">${eyebrow}</div>
        <h1>${headline}</h1>
        <p class="lede">${subtitle}</p>
      </div>
      <aside class="city-note">
        <div class="cn-title">${t("cn_title")}</div>
      </aside>
    </section>${body}`;
}

function renderHome() {
  const types = ["all", "Community", "Temple", "Apartment", "Other"];
  const sorts = [["popular", "sort_popular"], ["newest", "sort_newest"], ["az", "sort_az"]];
  shell(
    t("home_eyebrow"), t("home_headline"), t("home_lede"),
    `<section class="filters">
      <div class="search-wrap">
        <input class="search" id="search" placeholder="${esc(t("search_ph"))}" value="${esc(state.query)}" aria-label="${esc(t("search_aria"))}">
      </div>
      <div class="chips">${types.map(v => `<button class="chip ${state.type === v ? "active" : ""}" data-type="${v}">${typeMarks[v] || ""} ${esc(typeLabel(v))}</button>`).join("")}</div>
    </section>
    <section class="explorer">
      <aside class="panel">
        <div class="panel-head"><span>${nDiscover(filtered().length)}</span>
          <label class="sort"><span class="sort-label">${esc(t("sort_label"))}</span><select id="sort" aria-label="${esc(t("sort_label"))}">${sorts.map(([v, k]) => `<option value="${v}">${esc(t(k))}</option>`).join("")}</select></label></div>
        <div class="list" id="list"></div>
      </aside>
      <section class="map-wrap">
        <div id="map"></div>
        <div class="map-badge">${esc(t("season").replace("· 2026", "").trim())} · 12.2958° N, 76.6394° E</div>
        <div class="map-tools"><button id="showAll">${esc(t("show_all"))}</button></div>
        <div class="legend"><span><i class="dot"></i>${esc(typeLabel("Community"))}</span><span><i class="dot temple"></i>${esc(typeLabel("Temple"))}</span><span><i class="dot apartment"></i>${esc(typeLabel("Apartment"))}</span><span><i class="dot other"></i>${esc(typeLabel("Other"))}</span></div>
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
  document.querySelector("#showAll").addEventListener("click", fitMysuru);
  renderList();
  renderMap();
  renderLoved();
  const pid = new URLSearchParams(location.search).get("p");
  if (pid) {
    if (withLikes().some(x => String(x.id) === pid)) selectPandal(pid);
  }
}

function renderList() {
  const rows = filtered();
  document.querySelector("#list").innerHTML = rows.length ? rows.map(card).join("") : `<p class="empty">${esc(t("empty_list"))}</p>`;
  document.querySelectorAll("[data-select]").forEach(btn => btn.addEventListener("click", () => selectPandal(btn.dataset.select)));
  document.querySelectorAll("[data-like]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    toggleLike(btn.dataset.like);
    renderList();
    renderLoved();
    refreshMarkers();
    const s = document.querySelector(".stats");
    if (s) s.replaceWith(statsNode());
  }));
}

function toggleLike(id) {
  const ids = likedIds();
  const wasLiked = ids.has(id);
  wasLiked ? ids.delete(id) : ids.add(id);
  saveLikes(ids);
  const p = (remote || []).find(x => x.id === id);
  if (p) p.likes = Math.max(0, (p.likes || 0) + (wasLiked ? -1 : 1));
  if (remote !== null) {
    fetch(`${SB_URL}/rest/v1/rpc/${wasLiked ? "unlike_ganesha" : "like_ganesha"}`, {
      method: "POST", headers: SB_HJSON, body: JSON.stringify({ gid: id })
    }).catch(() => {});
  }
}

function card(p) {
  const pending = p.status !== "Community verified";
  const photoStyle = p.photo ? ` style="background-image:url('${p.photo}');background-size:cover;background-position:center"` : "";
  return `<article class="card ${state.selected === p.id ? "selected" : ""}">
    <button class="photo${p.photo ? " has-photo" : ""}" data-select="${p.id}"${photoStyle} aria-label="${esc(p.name)}"><span class="tag">${typeMarks[p.type] || ""} ${esc(typeLabel(p.type))}</span></button>
    <div class="card-body">
      <div class="locality">${esc(p.area)}</div>
      <h3>${esc(p.name)}</h3>
      <div class="card-foot">
        <span class="status ${pending ? "pending" : ""}">${esc(statusLabel(p.status))}</span>
        <button class="heart ${p.liked ? "on" : ""}" data-like="${p.id}" aria-pressed="${p.liked}" aria-label="${esc(p.name)}">${p.liked ? "♥" : "♡"} ${p.likes}</button>
      </div>
    </div>
  </article>`;
}

function renderMap() {
  if (typeof L === "undefined") { const el = document.querySelector("#map"); if (el) el.innerHTML = `<div class="empty" style="margin:16px">${esc(t("map_fail"))}</div>`; return; }
  if (map) map.remove();
  map = L.map("map", { scrollWheelZoom: true, zoomControl: true, doubleClickZoom: true, minZoom: 10, maxZoom: 18 }).setView(center, 12);
  map.zoomControl.setPosition("topright");
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
  if (typeof L.markerClusterGroup === "function") {
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: c => L.divIcon({ className: "", html: `<div class="cluster">${c.getChildCount()}</div>`, iconSize: [40, 40] })
    });
    map.addLayer(cluster);
  }
  addMapControls(map);
  refreshMarkers();
}

function addMapControls(m) {
  const makeBtn = (title, svg, onClick) => {
    const b = L.DomUtil.create("button", "map-ctrl");
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    b.innerHTML = svg;
    L.DomEvent.on(b, "click", e => { L.DomEvent.stop(e); onClick(); });
    L.DomEvent.disableClickPropagation(b);
    return b;
  };
  const crosshair = `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const expand = `<svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const Locate = L.Control.extend({ options: { position: "topright" }, onAdd: () => makeBtn(t("ctrl_locate"), crosshair, locateUser) });
  const Full = L.Control.extend({ options: { position: "topright" }, onAdd: () => makeBtn(t("ctrl_full"), expand, toggleFullscreen) });
  m.addControl(new Locate());
  m.addControl(new Full());
}

function locateUser() {
  if (!navigator.geolocation || !map) return;
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
    () => toast(t("err_locate"))
  );
}

function toggleFullscreen() {
  const wrap = document.querySelector(".map-wrap");
  if (!wrap) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (wrap.requestFullscreen) {
    wrap.requestFullscreen().catch(() => toast(t("err_full_na")));
  } else {
    toast(t("err_full_ns"));
  }
}
document.addEventListener("fullscreenchange", () => { if (map) setTimeout(() => map.invalidateSize(), 120); });

function refreshMarkers() {
  if (!map) return;
  if (cluster) {
    cluster.clearLayers();
    markers = filtered().map(p => {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p, state.selected === p.id) });
      m.on("click", () => selectPandal(p.id, true));
      return m;
    });
    cluster.addLayers(markers);
  } else {
    markers.forEach(m => map.removeLayer(m));
    markers = filtered().map(p => {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p, state.selected === p.id) }).addTo(map);
      m.on("click", () => selectPandal(p.id, true));
      return m;
    });
  }
}

function pinIcon(p, active = false) {
  const color = p.type === "Temple" ? "#cf9a2e" : p.type === "Apartment" ? "#3f6b5a" : p.type === "Other" ? "#97455a" : "#a83c22";
  return L.divIcon({ className: "pin-wrap", html: `<div class="pin${active ? " active" : ""}" style="background:${color}"><span>${typeMarks[p.type] || "✿"}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32] });
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
  const about = p.about ? esc(p.about) : esc(tf("about_fallback", { area: p.area }));
  const events = (p.events || []).filter(e => e.name || e.date || e.time);
  const infoRows = [
    p.visarjan ? { icon: "📅", label: t("info_visarjan"), value: fmtDate(p.visarjan) } : null,
    p.timings ? { icon: "🕉", label: t("info_timings"), value: p.timings } : null,
    p.access ? { icon: "👥", label: t("info_access"), value: p.access } : null,
    p.organiser ? { icon: "🎪", label: t("info_organiser"), value: p.organiser } : null
  ].filter(Boolean);
  const whatsHappening = events.length
    ? events.map(e => `<div class="ev-item"><strong>${esc(e.name || "")}</strong><span>${[fmtDate(e.date), e.time].filter(Boolean).join(" · ") || esc(t("time_tbc"))}</span></div>`).join("")
    : `<p class="muted-line">${esc(t("event_none"))}</p>`;
  const shareUrl = `${location.origin}/?p=${p.id}`;
  const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`;
  const social = socialLink(p.social);
  const cityLabel = t("season").replace("· 2026", "").trim();
  el.innerHTML = `
    <button class="detail-close" id="detailClose" aria-label="${esc(t("detail_close"))}">✕</button>
    <div class="detail-photo${p.photo ? " has-photo" : ""}"${photoStyle}></div>
    <div class="detail-body">
      <div class="detail-tags"><span class="tag">${typeMarks[p.type] || ""} ${esc(typeLabel(p.type))}</span><span class="status ${pending ? "pending" : ""}">${esc(statusLabel(p.status))}</span></div>
      <h2>${esc(p.name)}</h2>
      <div class="detail-loc">⌖ ${esc(p.area)}, ${esc(cityLabel)}</div>
      <div class="detail-meta"><span class="rankline">${nRank(rank)}</span><button class="heart ${p.liked ? "on" : ""}" data-like="${p.id}" aria-pressed="${p.liked}">${p.liked ? "♥" : "♡"} ${p.likes}</button></div>
      <p class="detail-about">${about}</p>
      ${infoRows.length ? `<div class="info-rows">${infoRows.map(r => `<div class="info-row"><span class="info-ic" aria-hidden="true">${r.icon}</span><span><small>${esc(r.label)}</small><strong>${esc(r.value)}</strong></span></div>`).join("")}</div>` : ""}
      <div class="detail-block"><h3>${esc(t("whats_happening"))}</h3>${whatsHappening}</div>
      <div class="detail-actions">
        <a class="primary" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">${esc(t("act_directions"))}</a>
        ${social ? `<a class="ghost social-link" href="${social.url}" target="_blank" rel="noopener"><span aria-hidden="true">${social.icon}</span> ${esc(tf("act_follow", { label: social.label }))}</a>` : ""}
        <a class="osm-link" href="${osm}" target="_blank" rel="noopener">${esc(t("act_osm"))}</a>
        <div class="share-row">
          <a class="ghost share-wa" id="shareWa" href="https://wa.me/?text=${encodeURIComponent(`${p.name} · ${p.area}, ${cityLabel} · GaneshaTracker\n${shareUrl}`)}" target="_blank" rel="noopener">${esc(t("act_share_wa"))}</a>
          <button type="button" class="copy-btn" id="copyLink" aria-label="Copy link" data-url="${shareUrl}">⧉</button>
        </div>
        <p class="share-count" id="shareCount"${shareCounts()[id] ? "" : " hidden"}>${nShare(shareCounts()[id] || 0)}</p>
      </div>
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
  const copy = el.querySelector("#copyLink");
  if (copy) copy.addEventListener("click", () => copyToClipboard(copy.dataset.url, t("toast_copied")));
  const wa = el.querySelector("#shareWa");
  if (wa) wa.addEventListener("click", () => {
    const n = bumpShare(id);
    const c = el.querySelector("#shareCount");
    if (c) { c.textContent = nShare(n); c.hidden = false; }
  });
}

function copyToClipboard(text, msg) {
  const done = () => toast(msg);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch { toast(t("err_copy")); }
  ta.remove();
}
let toastTimer;
function toast(msg) {
  let el = document.querySelector("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = "✓ " + msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
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

function socialLink(raw) {
  if (!raw) return null;
  let s = raw.trim();
  let url;
  if (/^@[\w.]+$/.test(s)) {
    url = "https://instagram.com/" + s.slice(1);
  } else if (/^https?:\/\//i.test(s)) {
    url = s;
  } else {
    url = "https://" + s.replace(/^\/+/, "");
  }
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
  const m = [
    [/instagram\.com|instagr\.am/, "📷", "Instagram"],
    [/facebook\.com|fb\.com|fb\.me/, "👥", "Facebook"],
    [/(twitter\.com|x\.com)/, "𝕏", "X"],
    [/youtube\.com|youtu\.be/, "▶", "YouTube"],
    [/wa\.me|whatsapp\.com/, "💬", "WhatsApp"]
  ];
  for (const [re, icon, label] of m) if (re.test(host)) return { url, icon, label };
  return { url, icon: "↗", label: "Social page" };
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", { day: "numeric", month: "short" });
}

function fitMysuru() {
  if (markers.length && map) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.18));
}

function renderLoved() {
  const wrap = document.querySelector("#loved");
  if (!wrap) return;
  const rows = topRows(3);
  wrap.innerHTML = `<div class="loved-head"><h2>${esc(t("loved_head"))}</h2><a href="/leaderboard/" data-route>${esc(t("see_all"))}</a></div>
    <div class="loved-grid">${rows.map((p, i) => `<button class="loved-card" data-select="${p.id}"><span class="medal">${i + 1}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.area)}</small></span><span class="loved-likes">♡ ${p.likes}</span></button>`).join("")}</div>`;
  wrap.querySelectorAll("[data-select]").forEach(btn => btn.addEventListener("click", () => {
    selectPandal(btn.dataset.select);
    document.querySelector(".map-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

function stats() {
  const total = withLikes().reduce((sum, p) => sum + p.likes, 0);
  const views = pageViews != null ? Number(pageViews).toLocaleString(lang === "kn" ? "kn-IN" : "en-IN") : "…";
  return `<div class="stats">
    <span class="lead"><i class="dot apartment"></i>${esc(t("stats_lead"))}</span>
    <span>${nOnMap(pandals().length)}</span>
    <span><strong>${views}</strong> ${esc(t("page_views"))}</span>
    <a href="/leaderboard/" data-route><strong>${total}</strong> ${esc(t("fav_suffix"))}</a>
  </div>`;
}
function statsNode() {
  const wrap = document.createElement("div");
  wrap.innerHTML = stats();
  return wrap.firstElementChild;
}

function renderLeaderboard() {
  shell(
    t("leader_eyebrow"), t("leader_headline"), t("leader_lede"),
    `<section class="page leader-page">
      ${topRows(50).map((p, index) => `<div class="rank-row"><span class="rank-num">${index + 1}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.area)} · ${esc(typeLabel(p.type))}</small></span><span class="rank-likes">♡ ${p.likes}</span></div>`).join("")}
    </section>
    <div class="leader-cta"><a class="primary" href="/" data-route>${esc(t("leader_cta"))}</a></div>`
  );
}

function renderAdd() {
  const opt = "<span class=\"helper\">" + esc(t("optional")) + "</span>";
  app.innerHTML = `<section class="page route">
    <a class="back" href="/" data-route>${esc(t("back_map"))}</a>
    <div class="eyebrow">${esc(t("add_eyebrow"))}</div>
    <h1>${t("add_h1")}</h1>
    <p class="lede">${esc(t("add_lede"))}</p>
    <form id="pandalForm">
      <section class="form-section"><h2><span class="num">1</span>${esc(t("sec1"))}</h2>
        <div class="field-grid">
          <label>${esc(t("f_name"))} *<input required name="name" placeholder="${esc(t("f_name_ph"))}"></label>
          <label>${esc(t("f_area"))} *<input required name="area" placeholder="${esc(t("f_area_ph"))}"></label>
        </div>
        <label>${esc(t("f_type"))} *<select name="type"><option value="Community">${esc(typeLabel("Community"))}</option><option value="Temple">${esc(typeLabel("Temple"))}</option><option value="Apartment">${esc(typeLabel("Apartment"))}</option><option value="Other">${esc(typeLabel("Other"))}</option></select></label>
        <label>${esc(t("f_about"))} ${opt}<textarea name="about" placeholder="${esc(t("f_about_ph"))}"></textarea></label>
        <div class="field">
          <span class="field-label">${esc(t("f_photo"))} ${opt}</span>
          <label class="upload" id="uploadZone">
            <input type="file" id="photoInput" accept="image/*" hidden>
            <span class="u-prompt"><span class="u-icon">📷</span><strong>${esc(t("f_photo"))}</strong><span>${esc(t("f_photo_sub"))}</span><small>${esc(t("f_photo_small"))}</small></span>
          </label>
          <button type="button" class="u-remove" id="photoRemove" hidden>${esc(t("f_photo_remove"))}</button>
        </div>
      </section>
      <section class="form-section"><h2><span class="num">2</span>${esc(t("sec2"))}</h2>
        <div class="field">
          <span class="field-label">${esc(t("f_gmaps"))} ${opt}</span>
          <div class="linkrow">
            <input type="url" id="gmapsLink" placeholder="${esc(t("f_gmaps_ph"))}">
            <button type="button" class="ghost" id="findPin">${esc(t("f_findpin"))}</button>
          </div>
          <p class="link-hint">${esc(t("f_gmaps_hint"))}</p>
          <p class="link-status" id="linkStatus" role="status" hidden></p>
        </div>
        <p class="map-hint">${esc(t("f_map_hint"))}</p>
        <div id="formMap"></div>
        <div class="field-grid">
          <label>${esc(t("f_lat"))} *<input required name="lat" type="number" step="0.0001" value="12.2958"></label>
          <label>${esc(t("f_lng"))} *<input required name="lng" type="number" step="0.0001" value="76.6394"></label>
        </div>
        <label class="checks"><input required type="checkbox"><span>${esc(t("f_confirm1"))}</span></label>
      </section>
      <section class="form-section"><h2><span class="num">3</span>${esc(t("sec3"))}</h2>
        <label>${esc(t("f_timings"))} ${opt}<input name="timings" placeholder="${esc(t("f_timings_ph"))}"></label>
        <div class="field">
          <span class="field-label">${esc(t("f_events"))} ${opt}</span>
          <div id="eventList"></div>
          <button type="button" class="ghost add-event" id="addEvent">${esc(t("f_add_event"))}</button>
        </div>
        <div class="field-grid">
          <label>${esc(t("f_visarjan"))} ${opt}<input type="date" name="visarjan"></label>
          <label>${esc(t("f_organiser"))} ${opt}<input name="organiser" placeholder="${esc(t("f_organiser_ph"))}"></label>
        </div>
        <label>${esc(t("f_access"))} ${opt}<select name="access"><option value="Not confirmed">${esc(t("opt_not_confirmed"))}</option><option value="Open to visitors">${esc(t("opt_open"))}</option><option value="Residents / private access">${esc(t("opt_private"))}</option></select></label>
        <label>${esc(t("f_social"))} ${opt}<input type="text" name="social" placeholder="${esc(t("f_social_ph"))}"></label>
        <label class="checks"><input required type="checkbox"><span>${esc(t("f_confirm2"))}</span></label>
      </section>
      <div class="actions"><a class="ghost" href="/" data-route>${esc(t("f_cancel"))}</a><button class="primary" type="submit">${esc(t("f_submit"))}</button></div>
    </form>
  </section>`;
  setupPhotoUpload();
  setupEvents();
  if (typeof L === "undefined") {
    const el = document.querySelector("#formMap");
    if (el) el.innerHTML = `<div class="empty" style="margin:16px">${esc(t("map_fail_add"))}</div>`;
  } else {
    formMap = L.map("formMap", { scrollWheelZoom: true, zoomControl: true, minZoom: 10, maxZoom: 18 }).setView(center, 13);
    formMap.zoomControl.setPosition("topright");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(formMap);
    formMarker = L.marker(center, { draggable: true, icon: pinIcon({ type: "Community" }) }).addTo(formMap);
    formMarker.on("dragend", () => syncLatLng(formMarker.getLatLng()));
    formMap.on("click", e => { formMarker.setLatLng(e.latlng); syncLatLng(e.latlng); });
  }
  setupFindPin();
  const form = document.querySelector("#pandalForm");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const btn = form.querySelector("button[type=submit]");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t("saving");
    try {
      let photo_url = "";
      if (photoData) photo_url = await uploadPhoto(photoData);
      const row = {
        name: data.name, area: data.area, type: data.type,
        lat: Number(data.lat), lng: Number(data.lng),
        about: (data.about || "").trim(), timings: (data.timings || "").trim(),
        organiser: (data.organiser || "").trim(), visarjan: data.visarjan || "",
        access: data.access && data.access !== "Not confirmed" ? data.access : "",
        social: (data.social || "").trim(), events: collectEvents(),
        photo_url, verified: false, likes: 0
      };
      const res = await fetch(`${SB_URL}/rest/v1/ganeshas`, { method: "POST", headers: { ...SB_HJSON, Prefer: "return=representation" }, body: JSON.stringify(row) });
      if (!res.ok) throw new Error(await res.text());
      const inserted = await res.json();
      if (Array.isArray(remote) && inserted[0]) remote.unshift(mapRow(inserted[0]));
      else await loadGaneshas();
      navigate("/");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = label;
      alert(t("submit_fail"));
    }
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
    reader.onload = () => compressImage(reader.result, { maxBytes: PHOTO_MAX_BYTES, maxDim: 1400 }).then(dataUrl => {
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

// Target size for stored photos. ~900 KB keeps loads fast and fits many
// listings in limited storage. Bump toward 1_500_000 for slightly sharper photos.
const PHOTO_MAX_BYTES = 900000;

// Compress an image to a JPEG under maxBytes: lower quality first, then shrink
// dimensions, until it fits. Returns a data URL.
function compressImage(dataUrl, opts) {
  const maxBytes = (opts && opts.maxBytes) || 900000;
  const startDim = (opts && opts.maxDim) || 1400;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const render = (dim, q) => {
        const scale = Math.min(1, dim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        try { return canvas.toDataURL("image/jpeg", q); } catch { return null; }
      };
      const bytesOf = u => Math.ceil((u.length - (u.indexOf(",") + 1)) * 0.75);
      let dim = startDim, q = 0.82;
      let out = render(dim, q);
      if (!out) { resolve(dataUrl); return; }
      while (bytesOf(out) > maxBytes && q > 0.4) { q -= 0.1; out = render(dim, q) || out; }
      while (bytesOf(out) > maxBytes && dim > 640) { dim = Math.round(dim * 0.82); out = render(dim, q) || out; }
      resolve(out);
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
    if (!val) { show(t("fp_empty"), "warn"); return; }
    const coords = parseLatLng(val);
    if (coords) {
      setFormLocation(coords.lat, coords.lng);
      show(tf("fp_placed", { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) }), "ok");
    } else if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(val)) {
      show(t("fp_short"), "warn");
    } else {
      show(t("fp_none"), "warn");
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
      <input class="ev-name" placeholder="${esc(t("f_event_name_ph"))}">
      <input type="date" class="ev-date" aria-label="${esc(t("f_event_date"))}">
      <input type="time" class="ev-time" aria-label="${esc(t("f_event_time"))}">
      <button type="button" class="ev-del" aria-label="${esc(t("f_remove_event"))}">✕</button>`;
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

function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  const lt = document.querySelector("#langToggle");
  if (lt) {
    lt.textContent = lang === "en" ? "ಕನ್ನಡ" : "English";
    lt.setAttribute("aria-label", lang === "en" ? "Switch to Kannada" : "Switch to English");
  }
}

function render() {
  document.querySelectorAll("[data-nav]").forEach(a => {
    const active = a.dataset.nav === "home" ? location.pathname === "/" : location.pathname.startsWith(`/${a.dataset.nav}`);
    a.classList.toggle("active", active);
  });
  if (map) { map.remove(); map = null; }
  if (formMap) { formMap.remove(); formMap = null; }
  markers = [];
  cluster = null;
  if (location.pathname.startsWith("/add")) renderAdd();
  else if (location.pathname.startsWith("/leaderboard")) renderLeaderboard();
  else renderHome();
  app.firstElementChild?.classList.add("route");
  window.scrollTo({ top: 0, behavior: "auto" });
}

const langToggle = document.querySelector("#langToggle");
if (langToggle) langToggle.addEventListener("click", () => {
  lang = lang === "en" ? "kn" : "en";
  try { localStorage.setItem("mysuru-lang", lang); } catch {}
  applyStatic();
  render();
});

async function init() {
  await loadGaneshas();
  applyStatic();
  render();
  bumpPageViews();
}
init();
