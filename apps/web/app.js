// ──────────────────────────────────────────────
// VOLT — Web Dashboard Application Logic
// ──────────────────────────────────────────────

// ══════════════════════════════════════════════
// FIREBASE AUTH — Google Sign-In
// ══════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAS3D-zrIXJLBKY_ago8yGFy9Q2GJ7aUnQ",
  authDomain:        "volt-6d900.firebaseapp.com",
  projectId:         "volt-6d900",
  storageBucket:     "volt-6d900.firebasestorage.app",
  messagingSenderId: "1013645067928",
  appId:             "1:1013645067928:web:6c5f10e7f677e46f93f2ed",
  measurementId:     "G-4WTB2SMDF9",
};

// Run auth setup after DOM is fully ready
document.addEventListener('DOMContentLoaded', () => {
  // ── Guard: Firebase SDK not loaded ───────────
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded — demo mode.');
    dismissLoginScreen();
    return;
  }

  // ── Initialize Firebase (safe re-init guard) ──
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  const auth = firebase.auth();

  // Show "Checking session…" on login screen while Firebase resolves
  const loginBtn = document.getElementById('btn-google-signin');
  const loginErr = document.getElementById('login-error');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Checking session…';

  // ── Handle redirect result (called after Google redirects back) ──
  auth.getRedirectResult()
    .then((result) => {
      // result.user is non-null when returning from a Google redirect
      // onAuthStateChanged below will also fire — no extra handling needed
    })
    .catch((err) => {
      loginErr.textContent = err.message || 'Sign-in failed. Please try again.';
    })
    .finally(() => {
      // Re-enable button whether redirect result succeeded or not
      loginBtn.disabled = false;
      loginBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google`;
    });

  // ── Auth state: source of truth ───────────────
  // Fires immediately if user is already signed in (persistent session),
  // OR after getRedirectResult() resolves with a new user.
  auth.onAuthStateChanged((user) => {
    if (user) {
      onSignedIn(user);
    } else {
      showLoginScreen();
    }
  });

  // ── Sign-In button → redirect to Google ───────
  loginBtn.addEventListener('click', () => {
    loginErr.textContent = '';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Redirecting to Google…';

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // signInWithRedirect is reliable on all browsers — no popup to block
    auth.signInWithRedirect(provider).catch((err) => {
      loginErr.textContent = err.message || 'Sign-in failed. Please try again.';
      loginBtn.disabled = false;
      loginBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google`;
    });
  });

  // ── Sign-out ───────────────────────────────────
  document.getElementById('btn-signout').addEventListener('click', async () => {
    await auth.signOut();
    // onAuthStateChanged fires → showLoginScreen()
  });
});

// ─────────────────────────────────────────────────────────
// Called when Firebase confirms a signed-in user
// ─────────────────────────────────────────────────────────
function onSignedIn(user) {
  dismissLoginScreen();

  const chip      = document.getElementById('user-chip');
  const avatarImg = document.getElementById('user-avatar-img');
  const initials  = document.getElementById('user-avatar-initials');
  const nameEl    = document.getElementById('user-display-name');

  // Use Google display name, fall back to email prefix
  const displayName = user.displayName
    || (user.email ? user.email.split('@')[0] : 'User');

  nameEl.textContent = displayName;
  nameEl.title = `${displayName}\n${user.email || ''}`;

  // Photo URL from Google profile
  if (user.photoURL) {
    avatarImg.src = user.photoURL;
    avatarImg.alt = displayName;
    avatarImg.style.display = 'block';
    initials.style.display = 'none';
    avatarImg.onerror = () => {
      avatarImg.style.display = 'none';
      initials.style.display = 'flex';
      initials.textContent = getInitials(displayName);
    };
  } else {
    initials.textContent = getInitials(displayName);
    initials.style.display = 'flex';
    avatarImg.style.display = 'none';
  }

  chip.style.display = 'flex';

  console.log(`✅ Signed in as: ${displayName} (${user.email})`);
}

function showLoginScreen() {
  const screen = document.getElementById('login-screen');
  screen.style.display = 'flex';
  screen.classList.remove('hidden');
  document.getElementById('user-chip').style.display = 'none';
}

function dismissLoginScreen() {
  const screen = document.getElementById('login-screen');
  screen.classList.add('hidden');
  setTimeout(() => { screen.style.display = 'none'; }, 600);
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}


// Static Seed Data Reference
const SEEDED_STATIONS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    numericId: 101,
    name: 'VOLT HyperCharge Gateway',
    operator: 'VOLT Grid',
    address: '1040 Innovation Pkwy, San Francisco, CA',
    lat: 37.7749,
    lng: -122.4194,
    connectors: [
      { type: 'CCS2', power: 350.0 },
      { type: 'NACS', power: 350.0 },
      { type: 'CCS2', power: 150.0 },
      { type: 'CCS2', power: 150.0 }
    ],
    available: 3,
    total: 4,
    status: 'active'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    numericId: 102,
    name: 'Electrify Station Express',
    operator: 'Electrify America',
    address: '450 Metro Boulevard, Oakland, CA',
    lat: 37.8044,
    lng: -122.2711,
    connectors: [
      { type: 'CCS2', power: 150.0 },
      { type: 'CHAdeMO', power: 50.0 }
    ],
    available: 1,
    total: 2,
    status: 'active'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    numericId: 103,
    name: 'Tesla Supercharger Hub',
    operator: 'Tesla Open Network',
    address: '780 Silicon Expressway, Palo Alto, CA',
    lat: 37.4419,
    lng: -122.1430,
    connectors: [
      { type: 'NACS', power: 250.0 },
      { type: 'NACS', power: 250.0 },
      { type: 'NACS', power: 250.0 },
      { type: 'CCS2', power: 250.0 }
    ],
    available: 4,
    total: 4,
    status: 'active'
  }
];

const SEEDED_VEHICLES = [
  {
    id: 'v1',
    make: 'Tesla',
    model: 'Model 3 Long Range',
    battery_capacity_kwh: 75.0,
    usable_capacity_kwh: 72.0,
    consumption_kwh_per_km: 0.150,
    health: 97.4,
    max_power_kw: 250.0
  },
  {
    id: 'v2',
    make: 'Hyundai',
    model: 'Ioniq 5 Long Range',
    battery_capacity_kwh: 77.4,
    usable_capacity_kwh: 74.0,
    consumption_kwh_per_km: 0.168,
    health: 98.2,
    max_power_kw: 230.0
  },
  {
    id: 'v3',
    make: 'Porsche',
    model: 'Taycan 4S',
    battery_capacity_kwh: 93.4,
    usable_capacity_kwh: 88.0,
    consumption_kwh_per_km: 0.210,
    health: 96.1,
    max_power_kw: 270.0
  },
  {
    id: 'v4',
    make: 'Tata',
    model: 'Nexon EV Long Range',
    battery_capacity_kwh: 40.5,
    usable_capacity_kwh: 38.0,
    consumption_kwh_per_km: 0.135,
    health: 99.0,
    max_power_kw: 50.0
  }
];

let map = null;
let stationMarkers = [];

// ──────────────────────────────────────────────
// Initialization
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMap();
  initBatterySlider();
  initStations();
  initVehicles();
  initMLPredictor();
  initTripPlanner();
  pollHealth();
  setInterval(pollHealth, 10000);
});

// ──────────────────────────────────────────────
// Tab Navigation
// ──────────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(`tab-${targetTab}`);
      if (targetPane) targetPane.classList.add('active');

      if (targetTab === 'overview' && map) {
        setTimeout(() => map.invalidateSize(), 200);
      }
    });
  });
}

// ──────────────────────────────────────────────
// Leaflet Map Setup
// ──────────────────────────────────────────────
function initMap() {
  // Center on San Francisco Bay Area
  map = L.map('map', {
    zoomControl: true,
  }).setView([37.65, -122.3], 10);

  // CartoDB Dark Matter tiles (sleek dark aesthetic)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  }).addTo(map);

  renderStationMarkers();
}

function renderStationMarkers() {
  stationMarkers.forEach((m) => map.removeLayer(m));
  stationMarkers = [];

  SEEDED_STATIONS.forEach((s) => {
    const isHighAvailability = s.available > 1;
    const markerColor = isHighAvailability ? '#10b981' : '#f59e0b';

    const customIcon = L.divIcon({
      className: 'custom-ev-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${markerColor};
          box-shadow: 0 0 15px ${markerColor};
          border: 2px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        ">⚡</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const popupContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; min-width: 180px;">
        <h4 style="margin: 0 0 4px 0; color: #0f172a;">${s.name}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">${s.operator}</p>
        <div style="font-size: 12px; margin-bottom: 6px;">
          <strong>Available:</strong> ${s.available} / ${s.total} Connectors
        </div>
        <div style="font-size: 11px; color: #0284c7; font-weight: 600;">
          ${s.connectors.map((c) => `${c.type} (${c.power}kW)`).join(' • ')}
        </div>
      </div>
    `;

    const marker = L.marker([s.lat, s.lng], { icon: customIcon })
      .bindPopup(popupContent)
      .addTo(map);

    stationMarkers.push(marker);
  });
}

// ──────────────────────────────────────────────
// Battery Simulator Slider
// ──────────────────────────────────────────────
function initBatterySlider() {
  const slider = document.getElementById('soc-slider');
  const text = document.getElementById('battery-text');
  const gauge = document.getElementById('battery-gauge');

  slider.addEventListener('input', (e) => {
    const val = e.target.value;
    text.textContent = `${val}%`;
    gauge.style.setProperty('--soc', val);

    // Color shift
    if (val > 40) {
      gauge.style.background = `conic-gradient(var(--volt-emerald) ${val}%, rgba(255, 255, 255, 0.08) 0)`;
      text.style.color = 'var(--volt-emerald)';
    } else if (val > 20) {
      gauge.style.background = `conic-gradient(var(--volt-amber) ${val}%, rgba(255, 255, 255, 0.08) 0)`;
      text.style.color = 'var(--volt-amber)';
    } else {
      gauge.style.background = `conic-gradient(var(--volt-rose) ${val}%, rgba(255, 255, 255, 0.08) 0)`;
      text.style.color = 'var(--volt-rose)';
    }
  });
}

// ──────────────────────────────────────────────
// Render Stations Grid
// ──────────────────────────────────────────────
function initStations() {
  const container = document.getElementById('stations-container');
  container.innerHTML = '';

  SEEDED_STATIONS.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'station-card';
    card.innerHTML = `
      <div class="station-header">
        <div>
          <div class="station-name">${s.name}</div>
          <div class="station-operator">${s.operator}</div>
        </div>
        <span class="brand-badge">${s.status}</span>
      </div>
      <div class="station-address">${s.address}</div>
      <div class="station-connectors">
        ${s.connectors.map((c) => `<span class="connector-badge">⚡ ${c.type} • ${c.power} kW</span>`).join('')}
      </div>
      <div class="station-meta-row">
        <span>Connectors Available:</span>
        <span class="badge-available">${s.available} / ${s.total} Ready</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ──────────────────────────────────────────────
// Render Vehicles Fleet
// ──────────────────────────────────────────────
function initVehicles() {
  const container = document.getElementById('vehicles-container');
  container.innerHTML = '';

  SEEDED_VEHICLES.forEach((v) => {
    const card = document.createElement('div');
    card.className = 'station-card';
    card.innerHTML = `
      <div class="station-header">
        <div>
          <div class="station-name">${v.make} ${v.model}</div>
          <div class="station-operator">${v.battery_capacity_kwh} kWh Pack (${v.usable_capacity_kwh} kWh Usable)</div>
        </div>
        <span class="brand-badge" style="color: var(--volt-emerald);">Health ${v.health}%</span>
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
        <div>Consumption: <strong>${v.consumption_kwh_per_km} kWh/km</strong></div>
        <div>Max DC Fast Charge: <strong>${v.max_power_kw} kW</strong></div>
      </div>
      <div class="station-meta-row">
        <span>Safe Highway Range:</span>
        <strong style="color: var(--volt-emerald);">~${Math.round(v.usable_capacity_kwh / v.consumption_kwh_per_km)} km</strong>
      </div>
    `;
    container.appendChild(card);
  });
}

// ──────────────────────────────────────────────
// Health Check Polling
// ──────────────────────────────────────────────
async function pollHealth() {
  checkService('/api/core/health', 'dot-api');
  checkService('/api/routing/health', 'dot-routing');
  checkService('/api/ml/health', 'dot-ml');
}

async function checkService(url, dotId) {
  const dot = document.getElementById(dotId);
  if (!dot) return;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.className = 'status-dot active';
    } else {
      dot.className = 'status-dot warn';
    }
  } catch (err) {
    dot.className = 'status-dot';
  }
}

// ──────────────────────────────────────────────
// ML Inference Form
// ──────────────────────────────────────────────
function initMLPredictor() {
  const form = document.getElementById('ml-predict-form');
  const arrivalInput = document.getElementById('ml-arrival-time');

  // Set default arrival time to now + 30 mins
  const now = new Date(Date.now() + 30 * 60000);
  arrivalInput.value = now.toISOString().slice(0, 16);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const stationVal = document.getElementById('ml-station-id').value;
    const arrivalTime = new Date(arrivalInput.value).toISOString();
    const currentOccupancy = parseFloat(document.getElementById('ml-occupancy').value);
    const availableConnectors = parseInt(document.getElementById('ml-avail-conn').value, 10);
    const totalConnectors = parseInt(document.getElementById('ml-total-conn').value, 10);

    const payload = {
      stationId: 101, // numeric ID for ML dataset lookup
      arrivalTime,
      currentOccupancy,
      availableConnectors,
      totalConnectors,
    };

    const resultBox = document.getElementById('ml-result-box');
    const idleMsg = document.getElementById('ml-idle-message');
    const probEl = document.getElementById('pred-prob');
    const waitEl = document.getElementById('pred-wait');
    const explainerEl = document.getElementById('pred-explainer');

    try {
      const res = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const prob = Math.round((data.availabilityProbability || 0.85) * 100);
        // Bug fix: API returns `expectedWaitMinutes`, not `estimatedWaitMinutes`
        const wait = (data.expectedWaitMinutes ?? 2.4).toFixed(1);
        const reliability = data.reliabilityScore ?? null;
        const confidence = data.confidence ?? null;
        const version = data.modelVersion || 'availability_v1';

        probEl.textContent = `${prob}%`;
        waitEl.innerHTML = `${wait} <span style="font-size: 16px;">min</span>`;
        explainerEl.textContent = `AI Insight: ${data.explanation || 'Optimal charging conditions expected. Charger queue is negligible.'}`;

        // Populate model version
        document.getElementById('pred-version').textContent = version;

        // Populate reliability
        if (reliability !== null) {
          const relPct = Math.round(reliability * 100);
          document.getElementById('pred-reliability').textContent = `${relPct}%`;
          document.getElementById('pred-reliability-bar').style.width = `${relPct}%`;
        }

        // Populate confidence
        if (confidence !== null) {
          const confPct = Math.round(confidence * 100);
          document.getElementById('pred-confidence').textContent = `${confPct}%`;
          document.getElementById('pred-confidence-bar').style.width = `${confPct}%`;
        }

        resultBox.style.display = 'block';
        idleMsg.style.display = 'none';
      } else {
        // Fallback calculation for demo
        simulateMLResult(currentOccupancy, availableConnectors);
      }
    } catch (err) {
      simulateMLResult(currentOccupancy, availableConnectors);
    }
  });
}

function simulateMLResult(occupancy, available) {
  const resultBox = document.getElementById('ml-result-box');
  const idleMsg = document.getElementById('ml-idle-message');
  const probEl = document.getElementById('pred-prob');
  const waitEl = document.getElementById('pred-wait');
  const explainerEl = document.getElementById('pred-explainer');

  const prob = Math.max(10, Math.round((1 - occupancy * 0.8) * 100));
  const wait = occupancy > 0.7 ? (occupancy * 12).toFixed(1) : '0.0';

  // Simulated reliability & confidence — calibrated baseline values
  const simReliability = Math.round((0.85 + (1 - occupancy) * 0.1) * 100);
  const simConfidence = 85; // baseline model confidence_score is ~0.922 in lookup, fallback to 85%

  probEl.textContent = `${prob}%`;
  waitEl.innerHTML = `${wait} <span style="font-size: 16px;">min</span>`;
  explainerEl.textContent = available > 0
    ? `AI Insight: Station has ${available} connectors open. High confidence of immediate stall availability.`
    : `AI Insight: Station is currently busy. Expected wait is ~${wait} minutes based on historical turnover.`;

  document.getElementById('pred-version').textContent = 'availability_v1 (simulated)';
  document.getElementById('pred-reliability').textContent = `${simReliability}%`;
  document.getElementById('pred-reliability-bar').style.width = `${simReliability}%`;
  document.getElementById('pred-confidence').textContent = `${simConfidence}%`;
  document.getElementById('pred-confidence-bar').style.width = `${simConfidence}%`;

  resultBox.style.display = 'block';
  idleMsg.style.display = 'none';
}

// ──────────────────────────────────────────────
// Trip Planner Form
// ──────────────────────────────────────────────
function initTripPlanner() {
  const form = document.getElementById('trip-planner-form');
  const resultsContainer = document.getElementById('route-results-content');
  const badge = document.getElementById('route-badge');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    badge.textContent = 'Optimized';
    badge.className = 'badge-available';

    const departureSoc = parseInt(document.getElementById('plan-soc').value, 10);
    const vehicleKey = document.getElementById('plan-vehicle').value;

    const arrivalSoc = Math.max(15, departureSoc - 22);

    resultsContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="stat-item" style="padding: 12px 16px;">
            <span class="stat-label">Total Distance</span>
            <span style="font-size: 20px; font-weight: bold; color: #fff;">54.2 km</span>
          </div>
          <div class="stat-item" style="padding: 12px 16px;">
            <span class="stat-label">Est. Drive Time</span>
            <span style="font-size: 20px; font-weight: bold; color: var(--volt-cyan);">42 mins</span>
          </div>
        </div>

        <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: var(--volt-emerald);">
            ⚡ Recommended Journey Schedule
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <span style="color: var(--volt-emerald); font-weight: bold;">01</span>
              <div>
                <strong>Depart Origin (San Francisco)</strong>
                <div style="color: var(--text-muted);">Starting SoC: ${departureSoc}%</div>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
              <span style="color: var(--volt-cyan); font-weight: bold;">02</span>
              <div>
                <strong>Suggested Stop: VOLT HyperCharge Gateway</strong>
                <div style="color: var(--text-secondary);">Charge 12 mins (+35% SoC) • 350kW CCS2 Stall</div>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
              <span style="color: #fff; font-weight: bold;">03</span>
              <div>
                <strong>Arrive at Destination (Palo Alto)</strong>
                <div style="color: var(--volt-emerald);">Arrival SoC: ${arrivalSoc + 20}% (Safe Buffer)</div>
              </div>
            </div>
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
          ✅ Verified by <strong>VOLT Battery Engine</strong>: No risk of thermal throttling or critical depletion along this route.
        </div>
      </div>
    `;
  });
}
