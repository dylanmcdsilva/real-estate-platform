// ── CONFIG ──────────────────────────────────────────
const API = "http://localhost:3000/api";

// ── STATE ───────────────────────────────────────────
let token = localStorage.getItem("token") || null;
let currentUser = null;
let properties = [];
let markers = [];
let heatLayer = null;
let currentLayer = "markers";
let lastClickCoords = null;

// ── MAP SETUP ────────────────────────────────────────
const map = L.map("map", { zoomControl: false }).setView([39.68, -8.85], 10);

L.control.zoom({ position: "bottomright" }).addTo(map);

// Dark map tiles
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19
}).addTo(map);

// Click to capture coords for add form
map.on("click", function(e) {
  lastClickCoords = e.latlng;
  document.getElementById("addLat").value = e.latlng.lat.toFixed(6);
  document.getElementById("addLng").value = e.latlng.lng.toFixed(6);
});

// ── AUTH UI ──────────────────────────────────────────
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab + "Form").classList.add("active");
  });
});

async function doLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const err = document.getElementById("authError");

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem("token", token);
    enterApp();
  } catch {
    err.textContent = "Connection failed. Is the server running?";
  }
}

async function doRegister() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const agency = document.getElementById("regAgency").value;
  const err = document.getElementById("authError");

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, agency })
    });

    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem("token", token);
    enterApp();
  } catch {
    err.textContent = "Connection failed. Is the server running?";
  }
}

async function enterApp() {
  // Try to restore session from token
  if (token && !currentUser) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        currentUser = await res.json();
      } else {
        token = null;
        localStorage.removeItem("token");
      }
    } catch {
      token = null;
    }
  }

  if (!currentUser) {
    document.getElementById("authOverlay").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    return;
  }

  document.getElementById("authOverlay").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("userChip").textContent = currentUser.name;

  loadProperties();
  loadStats();
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("token");
  document.getElementById("authOverlay").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

// ── PROPERTIES ───────────────────────────────────────
async function loadProperties(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.city) params.append("city", filters.city);
  if (filters.minPrice) params.append("minPrice", filters.minPrice);
  if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);

  try {
    const res = await fetch(`${API}/properties?${params}`);
    properties = await res.json();
    renderMap();
    renderList();
  } catch {
    console.error("Failed to load properties");
  }
}

function renderMap() {
  // Clear markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }

  if (currentLayer === "heat") {
    const maxPrice = Math.max(...properties.map(p => p.price), 1);
    const heatData = properties.map(p => [p.lat, p.lng, p.price / maxPrice]);
    heatLayer = L.heatLayer(heatData, { radius: 40, blur: 25 }).addTo(map);
    return;
  }

  properties.forEach(p => {
    const typeColors = {
      House: "#3ecf8e",
      Apartment: "#4a9eff",
      Land: "#d4a853",
      Commercial: "#e05c5c"
    };
    const color = typeColors[p.type] || "#8a90a0";

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width: 12px; height: 12px;
        background: ${color};
        border: 2px solid rgba(255,255,255,.3);
        border-radius: 50%;
        box-shadow: 0 0 0 4px ${color}33;
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    const marker = L.marker([p.lat, p.lng], { icon })
      .addTo(map)
      .bindPopup(buildPopup(p));

    marker.propertyId = p.id;
    markers.push(marker);
  });
}

function buildPopup(p) {
  return `
    <div class="popup-content">
      <div class="popup-name">${p.name}</div>
      <div class="popup-price">€${p.price.toLocaleString("pt-PT")}</div>
      <div class="popup-meta">
        <b>Type:</b> ${p.type}<br>
        <b>City:</b> ${p.city}<br>
        <b>Agency:</b> ${p.agency}<br>
        ${p.area ? `<b>Area:</b> ${p.area} m²<br>` : ""}
        ${p.bedrooms ? `<b>Bedrooms:</b> ${p.bedrooms}<br>` : ""}
        ${p.description ? `<i>${p.description}</i>` : ""}
      </div>
      <button class="popup-delete" onclick="deleteProperty(${p.id})">🗑 Delete</button>
    </div>
  `;
}

function renderList() {
  const list = document.getElementById("propertyList");
  document.getElementById("listingCount").textContent = properties.length;

  if (properties.length === 0) {
    list.innerHTML = `<p style="color:var(--text2);font-size:12px;text-align:center;padding:20px 0;">No properties found</p>`;
    return;
  }

  list.innerHTML = properties.map(p => `
    <div class="prop-card" onclick="focusProperty(${p.id})">
      <div class="prop-card-top">
        <div class="prop-card-name">${p.name}</div>
        <div class="prop-card-price">€${(p.price / 1000).toFixed(0)}k</div>
      </div>
      <div class="prop-card-meta">
        <span class="prop-type-badge type-${p.type}">${p.type}</span>
        <span>${p.city}</span>
        ${p.area ? `<span>${p.area}m²</span>` : ""}
      </div>
    </div>
  `).join("");
}

function focusProperty(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  map.setView([p.lat, p.lng], 15, { animate: true });
  const m = markers.find(m => m.propertyId === id);
  if (m) m.openPopup();
}

// ── STATS ────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/properties/meta/stats`);
    const stats = await res.json();

    document.getElementById("statTotal").textContent = stats.total;
    document.getElementById("statAvg").textContent =
      "€" + Math.round(stats.avgPrice).toLocaleString("pt-PT");

    const topCity = Object.entries(stats.byCity).sort((a,b) => b[1]-a[1])[0];
    const topType = Object.entries(stats.byType).sort((a,b) => b[1]-a[1])[0];

    document.getElementById("statCity").textContent = topCity ? topCity[0] : "—";
    document.getElementById("statType").textContent = topType ? topType[0] : "—";
  } catch {
    console.error("Stats failed");
  }
}

// ── FILTERS ──────────────────────────────────────────
function applyFilters() {
  loadProperties({
    type: document.getElementById("filterType").value,
    city: document.getElementById("filterCity").value,
    minPrice: document.getElementById("filterMinPrice").value,
    maxPrice: document.getElementById("filterMaxPrice").value
  });
}

function clearFilters() {
  document.getElementById("filterType").value = "";
  document.getElementById("filterCity").value = "";
  document.getElementById("filterMinPrice").value = "";
  document.getElementById("filterMaxPrice").value = "";
  loadProperties();
}

// ── LAYER TOGGLE ─────────────────────────────────────
function setLayer(type) {
  currentLayer = type;
  document.getElementById("btnMarkers").classList.toggle("active", type === "markers");
  document.getElementById("btnHeat").classList.toggle("active", type === "heat");
  renderMap();
}

// ── ADD PROPERTY ──────────────────────────────────────
function openAddModal() {
  document.getElementById("addModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
}

async function submitProperty() {
  const body = {
    name: document.getElementById("addName").value,
    type: document.getElementById("addType").value,
    price: Number(document.getElementById("addPrice").value),
    area: Number(document.getElementById("addArea").value) || undefined,
    bedrooms: Number(document.getElementById("addBedrooms").value) || 0,
    city: document.getElementById("addCity").value,
    description: document.getElementById("addDescription").value,
    lat: Number(document.getElementById("addLat").value),
    lng: Number(document.getElementById("addLng").value),
    agency: currentUser?.agency || "Independent"
  };

  if (!body.name || !body.price || !body.lat || !body.lng) {
    alert("Please fill in required fields (name, price, coordinates).");
    return;
  }

  try {
    const res = await fetch(`${API}/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) { alert("Failed to add property."); return; }

    closeAddModal();
    // Reset form
    ["addName","addPrice","addArea","addBedrooms","addCity","addDescription","addLat","addLng"]
      .forEach(id => document.getElementById(id).value = "");

    await loadProperties();
    await loadStats();
  } catch {
    alert("Server error.");
  }
}

// ── DELETE ────────────────────────────────────────────
async function deleteProperty(id) {
  if (!confirm("Delete this property?")) return;

  try {
    await fetch(`${API}/properties/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    map.closePopup();
    await loadProperties();
    await loadStats();
  } catch {
    alert("Delete failed.");
  }
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAddModal();
  if (e.key === "n" && e.ctrlKey) { e.preventDefault(); openAddModal(); }
});

// ── BOOT ──────────────────────────────────────────────
enterApp();
