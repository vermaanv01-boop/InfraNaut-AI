// ============================================================
// InfraNaut AI — Context Builder (RAG Context Compression)
// Builds scoped, token-efficient context for each agent type.
// Pattern borrowed and extended from touristAI.js BM25 approach.
// ============================================================

import { AGENT_TYPES } from './agentConfig'

// ── Formatting helpers ────────────────────────────────────

function pct(n) { return `${Math.round(n)}%` }
function classify(val, low, mid) {
  if (val < low) return 'LOW'
  if (val < mid) return 'MODERATE'
  return 'HIGH'
}

// ── Context Cache (30-second TTL) ────────────────────────
const contextCache = new Map()
const CACHE_TTL = 30_000

function getCached(key) {
  const entry = contextCache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.value
  return null
}
function setCache(key, value) {
  contextCache.set(key, { value, ts: Date.now() })
}

// ── Traffic Context ───────────────────────────────────────
function buildTrafficContext(trafficLevel, trafficSegments) {
  const cached = getCached('traffic')
  if (cached) return cached

  const redSegs = trafficSegments?.filter(s => s.color === '#ef4444').length || 0
  const total = trafficSegments?.length || 1
  const severity = trafficLevel > 70 ? 'SEVERE' : trafficLevel > 50 ? 'HIGH' : trafficLevel > 30 ? 'MODERATE' : 'LOW'

  const ctx = `=== LIVE TRAFFIC DATA ===
City-wide Congestion: ${pct(trafficLevel)} [${severity}]
Red Segments: ${redSegs}/${total} road segments congested
Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
Peak Hours: 8:00–10:00 AM and 5:00–8:00 PM (current: ${isPeakHour() ? 'YES — expect +30% congestion' : 'No'})
Bhopal Key Corridors: Hoshangabad Rd, Link Rd 1 & 2, VIP Rd, Kolar Rd, Berasia Rd, Raisen Rd`

  setCache('traffic', ctx)
  return ctx
}

// ── Parking Context (top-5 only, not all 15) ─────────────
function buildParkingContext(parkingSpots, destArea = null) {
  const cached = getCached(`parking-${destArea}`)
  if (cached) return cached

  if (!parkingSpots?.length) return '=== PARKING DATA ===\nNo parking data available.'

  // Sort by availability (most available first), take top 5
  const sorted = [...parkingSpots]
    .sort((a, b) => b.available - a.available)
    .slice(0, 6)

  const totalAvail = parkingSpots.reduce((s, p) => s + p.available, 0)
  const totalCap = parkingSpots.reduce((s, p) => s + p.capacity, 0)

  const rows = sorted.map(p =>
    `• ${p.name} (${p.area}): ${p.available}/${p.capacity} spots [${p.occupancy}% full]${p.available <= 5 ? ' ⚠️ NEAR FULL' : ''}`
  ).join('\n')

  const ctx = `=== LIVE PARKING DATA ===
City-wide: ${totalAvail} spots available of ${totalCap} total (${pct(100 - (totalAvail/totalCap)*100)} occupied)
Top Available Lots:
${rows}
Predicted trend: ${new Date().getHours() >= 17 && new Date().getHours() <= 20 ? 'Evening peak — lots filling fast' : 'Stable'}`

  setCache(`parking-${destArea}`, ctx)
  return ctx
}

// ── Weather Context ───────────────────────────────────────
function buildWeatherContext(weather) {
  if (!weather?.current) return '=== WEATHER ===\nLive weather unavailable.'
  const w = weather.current
  const comfort = w.temperature_2m > 35 ? 'Very Hot 🔴' :
                  w.temperature_2m > 28 ? 'Warm 🟡' :
                  w.temperature_2m > 20 ? 'Pleasant 🟢' : 'Cool 🔵'

  return `=== LIVE WEATHER — BHOPAL ===
Temperature: ${w.temperature_2m}°C [${comfort}]
Humidity: ${w.relative_humidity_2m}%
Wind Speed: ${w.wind_speed_10m} km/h
Precipitation: ${w.precipitation > 0 ? `${w.precipitation}mm ☔` : '0mm — No rain'}
${w.precipitation > 5 ? '⚠️ WARNING: Waterlogging risk in low-lying areas and underpasses.' : ''}
${w.precipitation > 20 ? '🚨 ALERT: Heavy rainfall. Avoid unnecessary travel.' : ''}`
}

// ── AQI Context ───────────────────────────────────────────
function buildAqiContext(aqi) {
  if (!aqi) return '=== AIR QUALITY ===\nAQI data unavailable.'
  return `=== LIVE AIR QUALITY — BHOPAL ===
AQI Value: ${aqi.value} [${aqi.label}]
${aqi.value > 150 ? '🚨 HEALTH ALERT: All groups should minimize outdoor exposure.' :
  aqi.value > 100 ? '⚠️ Sensitive groups (elderly, children, respiratory patients) should limit outdoor time.' :
  aqi.value > 50  ? '🟡 Moderate: Unusually sensitive individuals should consider limiting prolonged outdoor exertion.' :
  '✅ Good: Air quality is satisfactory. No health concerns.'}`
}

// ── Waste Context ─────────────────────────────────────────
function buildWasteContext(wasteBins) {
  if (!wasteBins?.length) return '=== WASTE MANAGEMENT ===\nNo bin data available.'

  const overflow = wasteBins.filter(b => b.status === 'overflow')
  const high = wasteBins.filter(b => b.status === 'high')
  const normal = wasteBins.filter(b => b.status === 'normal')

  const overflowList = overflow.slice(0, 4).map(b => `  • ${b.name}: ${b.fillLevel}% OVERFLOW`).join('\n')

  return `=== LIVE WASTE MANAGEMENT ===
Total Bins Monitored: ${wasteBins.length}
🔴 Overflow (>85%): ${overflow.length} bins${overflow.length > 0 ? `\n${overflowList}` : ''}
🟡 High (60–85%): ${high.length} bins
🟢 Normal (<60%): ${normal.length} bins
${overflow.length > 2 ? '⚠️ Multiple overflow events detected. Sanitation dispatch recommended.' : ''}`
}

// ── Energy Context ────────────────────────────────────────
function buildEnergyContext(energyZones) {
  if (!energyZones?.length) return '=== ENERGY GRID ===\nNo energy data available.'

  const anomalies = energyZones.filter(z => z.intensity > 0.9)
  const rows = energyZones.map(z =>
    `• ${z.name}: ${z.currentLoad}/${z.baseLoad} MW [${pct(z.intensity * 100)} capacity]${z.intensity > 0.9 ? ' ⚠️ HIGH LOAD' : ''}`
  ).join('\n')

  const totalLoad = energyZones.reduce((s, z) => s + z.currentLoad, 0)
  const totalBase = energyZones.reduce((s, z) => s + z.baseLoad, 0)

  return `=== LIVE ENERGY GRID ===
Total City Load: ${totalLoad}/${totalBase} MW (${pct((totalLoad/totalBase)*100)} of base capacity)
Zone Breakdown:
${rows}
${anomalies.length > 0 ? `⚠️ HIGH LOAD ZONES: ${anomalies.map(z => z.name).join(', ')}` : '✅ All zones within normal operating range.'}`
}

// ── Event Context (top-5 relevant events) ────────────────
function buildEventContext(events, query = '') {
  if (!events?.length) return '=== BHOPAL EVENTS ===\nNo event data available.'

  // Simple relevance: upcoming first, then ongoing
  const now = new Date()
  const relevant = events
    .filter(e => e.status !== 'past')
    .sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1
      return new Date(a.date) - new Date(b.date)
    })
    .slice(0, 5)

  const rows = relevant.map(e =>
    `• [${e.status.toUpperCase()}] ${e.name}
  Venue: ${e.venue} | Ward: ${e.ward}
  Date: ${e.date}${e.endDate ? ` – ${e.endDate}` : ''} | Time: ${e.timeSlot}
  Category: ${e.category} | Crowd: ${e.crowdLevel}
  ${e.description.slice(0, 100)}...`
  ).join('\n')

  return `=== BHOPAL LIVE EVENTS ===
Showing ${relevant.length} active/upcoming events:
${rows}`
}

// ── Main Builder ──────────────────────────────────────────
/**
 * Build a scoped context string for the given agent type.
 * Only fetches the data relevant to that agent.
 *
 * @param {string} agentType - from AGENT_TYPES
 * @param {object} cityState - slice of cityStore state
 * @param {object} opts - { query, events }
 * @returns {string} context string for LLM
 */
export function buildScopedContext(agentType, cityState = {}, opts = {}) {
  const {
    trafficLevel = 0,
    trafficSegments = [],
    parkingSpots = [],
    weather = null,
    aqi = null,
    wasteBins = [],
    energyZones = [],
  } = cityState

  const { events = [], query = '' } = opts

  const header = `=== INFRANAUT IOC — LIVE TELEMETRY ===
Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
City: Bhopal, Madhya Pradesh, India\n`

  let contextBody = ''

  switch (agentType) {
    case AGENT_TYPES.TRAFFIC:
      contextBody = buildTrafficContext(trafficLevel, trafficSegments)
      break
    case AGENT_TYPES.PARKING:
      contextBody = buildParkingContext(parkingSpots)
      break
    case AGENT_TYPES.WEATHER:
      contextBody = buildWeatherContext(weather)
      break
    case AGENT_TYPES.AQI:
      contextBody = buildAqiContext(aqi) + '\n' + buildWeatherContext(weather)
      break
    case AGENT_TYPES.WASTE:
      contextBody = buildWasteContext(wasteBins)
      break
    case AGENT_TYPES.ENERGY:
      contextBody = buildEnergyContext(energyZones)
      break
    case AGENT_TYPES.EVENT:
      contextBody = buildEventContext(events, query)
      break
    case AGENT_TYPES.ROUTING:
      // Routing needs traffic + weather for informed suggestions
      contextBody = buildTrafficContext(trafficLevel, trafficSegments) + '\n' +
                    buildWeatherContext(weather)
      break
    case AGENT_TYPES.GENERAL:
    case AGENT_TYPES.CITIZEN:
    default:
      // General: compact summary of all domains
      contextBody = [
        buildTrafficContext(trafficLevel, trafficSegments),
        buildWeatherContext(weather),
        buildAqiContext(aqi),
        buildParkingContext(parkingSpots),
        buildWasteContext(wasteBins),
      ].join('\n')
      break
  }

  return header + contextBody
}

// ── Helper ────────────────────────────────────────────────
function isPeakHour() {
  const h = new Date().getHours()
  return (h >= 8 && h <= 10) || (h >= 17 && h <= 20)
}

/**
 * Summarize city context for display in UI (shorter version)
 */
export function buildContextSummary(cityState = {}) {
  const { trafficLevel = 0, aqi = null, weather = null } = cityState
  const parts = []
  if (trafficLevel) parts.push(`Traffic: ${pct(trafficLevel)}`)
  if (weather?.current) parts.push(`${weather.current.temperature_2m}°C`)
  if (aqi) parts.push(`AQI: ${aqi.value} (${aqi.label})`)
  return parts.join(' · ')
}
