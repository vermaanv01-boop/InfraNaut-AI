# InfraNaut AI — Complete Platform Overhaul Plan

> **Analysis Date:** 2026-05-08 | **Model:** Claude Sonnet 4.6 (Thinking)
> **Codebase analyzed:** 40+ files across React 19, Vite, TailwindCSS v4, Three.js, Supabase, OpenRouter, Socket.io

---

## 🔬 Deep Architecture Analysis — Current State & Issues

### AI / RAG Layer
| File | Issues Found |
|---|---|
| `src/lib/openrouter.js` | System prompt is disconnected — city context appended as a string dump, no semantic scoping. `getCityContext()` sends ALL parking data (15 spots) every turn. Token-wasteful. |
| `src/lib/anythingllm.js` | 3-second timeout is too aggressive. Falls back to OpenRouter on ANY failure. No true RAG — the AnythingLLM workspace is a single generic `hackathon` bucket with no domain docs. |
| `src/lib/touristAI.js` | **Best part of the codebase.** Has real BM25 retrieval, intent detection, context compression. This pattern should be applied universally. |
| `src/pages/EventPage.jsx` | Prepends system prompt directly into RAG message string — a hack. Event data is only 3 dummy events. No real Bhopal events. |
| `src/pages/NexoraPage.jsx` | Uses `chatWithRAG` but does NOT pass city context. Loses live telemetry entirely. |

### State Management
| File | Issues Found |
|---|---|
| `src/stores/cityStore.js` | `refreshTrafficColors()` runs every 8s — causes cascade re-renders. `getCityContext()` sends all 15 parking spots as text every AI call (~800 tokens). `initCity()` and `destroyCity()` create interval leak risk if called from multiple pages. |
| `src/stores/mapStore.js` | Minimal — just holds reports. No sorting, filtering, status management. |
| `src/stores/authStore.js` | No role field. No admin detection. `onAuthStateChange` listener not cleaned up. |

### UI / Pages
| Page | Issues |
|---|---|
| `Dashboard.jsx` | Hardcoded `'56'` notifications. Weather simulation buttons are non-functional. Center column stats are mostly dummy. No ward breakdown. |
| `DigitalTwinPage.jsx` | Clicking landmark only shows a popup. No navigation, no route, no Google Maps link. AI chat inside the page uses a separate `NexoraChat` that doesn't share conversation history. |
| `EventPage.jsx` | 3 dummy events, no real Bhopal events with full data (ward, category, date, time, venue). System prompt is injected badly into the user turn. |
| `AnalyticsPage.jsx` | No ward heatmap, no time-series charts, no sustainability score. |
| `MapPage.jsx` | Image upload "Failed to fetch" when backend server is offline. No fallback to Supabase Storage direct upload. |

### Missing Features
- No Admin Panel or role-based access control
- No specialized AI agents (Traffic, Parking, AQI, etc.)
- No ward-level dashboards
- No AI control center / token monitoring
- No city health score
- No notification system beyond the alert modal
- No report status tracking (In Progress, Resolved, Rejected)
- Digital Twin has no Navigate/Route buttons on landmark click
- EventPage has no real Bhopal events with ward data

---

## 📋 Implementation Phases

---

### Phase 1 — AI Agent Architecture & RAG Optimization
**Goal:** Replace the single monolithic Nexora prompt with a specialized, domain-scoped multi-agent system.

#### 1a. Create `src/lib/agents/agentConfig.js`
Define 8 specialized agents with scoped system prompts and context selectors:
- `TrafficAgent` — reads `trafficLevel`, `trafficSegments`, suggests alternates
- `ParkingAgent` — reads `parkingSpots`, computes scores, suggests best lot
- `WeatherAgent` — reads `weather.current`, makes health/travel recommendations
- `AQIAgent` — reads `aqi`, gives health advisories
- `WasteAgent` — reads `wasteBins`, detects overflows, recommends dispatch
- `EnergyAgent` — reads `energyZones`, detects anomalies
- `EventAgent` — reads `BHOPAL_EVENTS` (new dataset), answers scheduling queries
- `CitizenAssistant` — general civic queries, gamification, report status

Each agent only receives its own relevant context slice, not the full city dump. This reduces tokens by ~70%.

#### 1b. Create `src/lib/agents/contextBuilder.js`
```
queryIntent → selectAgent → buildScopedContext(agentType) → callLLM
```
- Intent detection via keyword matching (extend from `touristAI.js` pattern)
- Context compression: summarize parking as "Top 3 available lots: ..." instead of all 15
- Limit context to 300 tokens max per query
- Cache last telemetry summary for 30 seconds

#### 1c. Refactor `src/lib/openrouter.js`
- Remove `cityContext` string dump from every call
- Replace with `buildScopedContext(intent)` per-query
- Add `temperature: 0.3` for factual operational queries (was 0.7)
- Add `max_tokens: 400` default (was 1024 — bloated)

#### 1d. Refactor `src/lib/anythingllm.js`
- Increase timeout to 8s
- On fallback, pass scoped context not empty string
- Add local cache: if same query within 60s, return cached response

---

### Phase 2 — Bhopal Event Intelligence System
**Goal:** Build a comprehensive, real Bhopal events database and a proper Event Agent.

#### 2a. Create `src/data/bhopalEvents.js`
Add 15+ real Bhopal events with full operational data:
```js
{
  id: 'ev1',
  name: 'Bhojpal Mahotsav 2025',
  category: 'Cultural Festival',
  venue: 'BHEL Dussehra Maidan, Piplani',
  ward: 'Ward 6 - Piplani',
  date: '2025-11-15',
  endDate: '2025-11-25',
  timeSlot: '18:00 - 22:00',
  status: 'upcoming', // ongoing | upcoming | past
  crowdLevel: 'High',
  expectedAttendance: 50000,
  description: '...',
  transportAdvice: '...',
  parkingNearby: ['BHEL Complex'],
  tags: ['food', 'culture', 'music', 'crafts'],
  lat: 23.2577, lng: 77.4654
}
```
Include events: Bhojpal Mahotsav, Ijtema, Sanchi Festival, IIFM Green Marathon, Rang Panchami Procession, Tansen Samaroh, Bhopal Literature Festival, Trade Fair, etc.

#### 2b. Refactor `src/pages/EventPage.jsx`
- Replace 3 dummy events with the full `BHOPAL_EVENTS` dataset
- Add category filters (All, Cultural, Heritage, Sports, Religious, Music)
- Add status filter (Upcoming, Ongoing, Past)
- Add ward filter
- Implement Event Agent with proper RAG: inject only relevant events into context based on query intent
- Add event detail modal with transport advice, parking suggestions
- Add map pin button to see event location on City Map

---

### Phase 3 — Digital Twin Interaction Upgrade
**Goal:** Fix the disconnect between clicking a landmark and actually navigating to it.

#### 3a. Upgrade `DigitalTwinPage.jsx` Panel Component
Add action buttons to the landmark panel:
- **"Navigate to this Location"** button → opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- **"View on City Map"** button → `navigate('/app/map')` and store selected landmark in Zustand
- **"Ask Nexora"** button → triggers the embedded chat with landmark context
- Improve panel UI with glassmorphism, smooth slide-in animation, image fallback handling

#### 3b. Add More Landmarks to `src/data/bhopalLandmarks.js`
Current: 6 landmarks. Target: 12 landmarks.
Add: Shaukat Mahal, Gohar Mahal, DB City Mall, Birla Mandir, Lower Lake, BHEL Township, Regional Science Centre, Sair Sapata.

#### 3c. Add Ward Visualization Layer
Add a second scene state: "Ward Mode" that shows colored ward zones with telemetry indicators instead of orbit landmarks.

---

### Phase 4 — Report Pipeline Fix
**Goal:** Fix the "Failed to fetch" upload error and add comprehensive status tracking.

#### 4a. Fix `src/pages/MapPage.jsx` — Dual Upload Strategy
```
1. Try backend upload (http://localhost:3001/api/upload/reports)
2. If backend unavailable → fall back to Supabase Storage direct upload
3. Show appropriate error messages
```
Add Supabase Storage fallback in `src/lib/imageCompression.js` or a new `src/lib/storage.js`.

#### 4b. Add Report Status Tracking
Extend `REPORT_CATEGORIES` / report display to show:
- `pending` → amber badge
- `verified` → teal badge  
- `in_progress` → blue badge
- `resolved` → green badge
- `rejected` → red badge

Add filtering by status in `MapPage.jsx`.

#### 4c. Add Report Detail Modal
On clicking a report marker, show full modal with:
- Status badge with timeline
- Image (if available)
- Description
- Zone/ward
- Upvote button (award points to original reporter)
- Share button

---

### Phase 5 — Admin Panel & Role-Based Access Control
**Goal:** Build a proper admin control center with role-based access.

#### 5a. Extend `src/stores/authStore.js`
- Add `role` field (fetched from `profiles.role` in Supabase)
- Add `isAdmin`, `isOperator` computed selectors
- Add `ROLES` constant: `super_admin`, `city_operator`, `traffic_manager`, `event_manager`, `waste_officer`, `energy_officer`

#### 5b. Create `src/pages/AdminPage.jsx`
Protected route: `role === 'super_admin' || role === 'city_operator'`

Tabs:
1. **IOC Overview** — real-time telemetry dashboard (re-use dashboard components)
2. **Report Management** — list all reports, change status, add notes
3. **Event Management** — CRUD for Bhopal events
4. **Ward Analytics** — per-ward telemetry, health scores
5. **AI Control Center** — view AI usage, switch models, update system prompt
6. **User Management** — view users, change roles

#### 5c. Add Admin Route to `App.jsx`
```jsx
<Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
```

---

### Phase 6 — Analytics Expansion & City Health Score
**Goal:** Transform analytics from basic charts into a real IOC intelligence layer.

#### 6a. Add City Health Score to `src/stores/cityStore.js`
```js
getCityHealthScore: () => {
  // Weighted score: traffic(25%) + AQI(20%) + parking(20%) + waste(20%) + energy(15%)
  // Returns 0-100 score with label: Critical / Fair / Good / Excellent
}
```

#### 6b. Upgrade `src/pages/AnalyticsPage.jsx`
Add:
- City Health Score ring chart (prominent KPI)
- Ward-level heatmap table (each ward: traffic%, parking%, AQI, waste overflows)
- Time-series chart for AQI (last 7 days via Open-Meteo hourly API)
- Energy efficiency trend chart
- Report resolution rate chart (by category)
- Sustainability score trend

#### 6c. Add `BHOPAL_WARDS_FULL` to `src/data/cityData.js`
Extended ward data with coordinates, zone type, population estimate for dashboard display.

---

### Phase 7 — Performance Optimization
**Goal:** Eliminate re-render cascades and make the platform feel real-time.

#### 7a. Fix `src/stores/cityStore.js` Interval Management
- Use `subscriberCount` pattern: only start intervals when first subscriber connects, stop when last one leaves
- Debounce `refreshTrafficColors` (8s → 12s, but with `useDeferredValue` for chart rendering)
- Memoize `getCityContext()` output — only rebuild when state actually changed
- Split store into `useTrafficStore`, `useParkingStore`, `useWeatherStore` to reduce re-render surface area

#### 7b. Lazy Load Pages in `App.jsx`
```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'))
// etc.
```
Wrap routes in `<Suspense>` with skeleton fallback.

#### 7c. Memoize Dashboard Components
Wrap `Panel`, `StatCard`, `TrafficTrend`, `ParkingOverview` with `React.memo`.
Move `trafficChartData` and `parkingChartData` computations to `useMemo` with correct deps.

#### 7d. Fix Three.js DPR
Change `dpr={[1,2]}` to `dpr={Math.min(window.devicePixelRatio, 1.5)}` — on high-DPI screens this was rendering at 2x unnecessarily.

---

### Phase 8 — UI/UX Polish & Notification System
**Goal:** Add the missing futuristic polish and a real notification center.

#### 8a. Upgrade `src/index.css`
Add:
- `@keyframes scan-line` for IOC-style scanning effects
- `@keyframes data-stream` for live data indicator animations
- `.ioc-panel` class with cyan border-corner accents (currently scattered inline in Dashboard.jsx)
- `.metric-card` with hover glow
- Better `.card` defaults for dark mode IOC context

#### 8b. Add Notification Center
Create `src/components/layout/NotificationCenter.jsx`:
- Floating bell icon in the sidebar/topbar
- Real-time alerts from `cityStore.getAlerts()`
- Mark as read functionality
- Auto-dismiss after 30 seconds for non-critical alerts
- Sound effect toggle (subtle click for critical alerts)

#### 8c. Add Map AI Assistant Overlay
Inside `MapPage.jsx`, add a collapsible AI assistant panel:
- Knows which layers are active
- Knows visible map region
- Can answer: "Is there parking near [clicked location]?"
- Uses `ParkingAgent` context scoped to nearby spots

---

## 🗃️ File Change Summary

| File | Action | Priority |
|---|---|---|
| `src/lib/agents/agentConfig.js` | CREATE | P1 🔴 |
| `src/lib/agents/contextBuilder.js` | CREATE | P1 🔴 |
| `src/lib/openrouter.js` | REFACTOR | P1 🔴 |
| `src/lib/anythingllm.js` | REFACTOR | P1 🔴 |
| `src/data/bhopalEvents.js` | CREATE | P1 🔴 |
| `src/pages/EventPage.jsx` | REWRITE | P1 🔴 |
| `src/pages/DigitalTwinPage.jsx` | ENHANCE | P2 🟠 |
| `src/data/bhopalLandmarks.js` | EXPAND | P2 🟠 |
| `src/pages/MapPage.jsx` | FIX + ENHANCE | P2 🟠 |
| `src/lib/storage.js` | CREATE | P2 🟠 |
| `src/stores/authStore.js` | ADD ROLES | P3 🟡 |
| `src/pages/AdminPage.jsx` | CREATE | P3 🟡 |
| `src/App.jsx` | ADD ROUTES + LAZY | P3 🟡 |
| `src/pages/AnalyticsPage.jsx` | UPGRADE | P3 🟡 |
| `src/stores/cityStore.js` | OPTIMIZE | P4 🟢 |
| `src/index.css` | ENHANCE | P4 🟢 |
| `src/components/layout/NotificationCenter.jsx` | CREATE | P4 🟢 |

---

## ⚠️ Critical Pre-Requisites

1. **Supabase `profiles` table** needs a `role` column (text, default `'citizen'`)
2. **Backend server** must be running on port 3001 for image uploads
3. **OpenRouter API key** must be valid in `.env`
4. `VITE_BACKEND_URL` must be set in `.env` (default: `http://localhost:3001`)

---

## 🚀 Recommended Execution Order

1. Phase 1 (AI agents) — highest impact, unblocks everything
2. Phase 2 (Events data) — quick data win, fills a visible gap
3. Phase 4 (Report fix) — critical UX bug currently visible to all users
4. Phase 3 (Digital Twin buttons) — quick UX win
5. Phase 5 (Admin) — requires Supabase schema change
6. Phase 6 (Analytics) — builds on clean state
7. Phase 7 (Performance) — final cleanup
8. Phase 8 (UI polish) — last mile
