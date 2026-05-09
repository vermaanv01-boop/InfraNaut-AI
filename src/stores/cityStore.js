import { create } from 'zustand'
import { PARKING_SPOTS, OCCUPANCY_PATTERNS, WASTE_BINS, ENERGY_ZONES, TRAFFIC_ROUTE_ENDPOINTS } from '../data/cityData'
import { WEATHER_URL } from '../utils/constants'

// ── Prediction helpers ──────────────────────────────────────
function predictParking(spot, hour) {
  const pattern = OCCUPANCY_PATTERNS[spot.type] || OCCUPANCY_PATTERNS.commercial
  const base = pattern[hour] || 0.5
  const jitter = 0.88 + Math.random() * 0.24          // ±12 %
  const occupancy = Math.min(0.98, Math.max(0.02, base * jitter))
  const available = Math.max(0, Math.round(spot.capacity * (1 - occupancy)))
  // AI predicted = slight forward-shift
  const nextHour = (hour + 1) % 24
  const nextBase = pattern[nextHour] || 0.5
  const predicted = Math.max(0, Math.round(spot.capacity * (1 - Math.min(0.98, nextBase * jitter))))
  return { ...spot, available, occupancy: Math.round(occupancy * 100), predicted }
}

function getTrafficColor(hour, segmentIndex) {
  const isPeakMorning = hour >= 8 && hour <= 10
  const isPeakEvening = hour >= 17 && hour <= 20
  const isNight = hour >= 22 || hour <= 5
  let redChance = 0.15, yellowChance = 0.30
  if (isPeakMorning || isPeakEvening) { redChance = 0.45; yellowChance = 0.35 }
  else if (isNight) { redChance = 0.05; yellowChance = 0.10 }
  const r = Math.random() + (segmentIndex % 3) * 0.05
  if (r < redChance) return '#ef4444'
  if (r < redChance + yellowChance) return '#eab308'
  return '#22c55e'
}

function simulateWaste() {
  return WASTE_BINS.map(bin => {
    const fillLevel = Math.round(Math.random() * 100)
    return { ...bin, fillLevel, status: fillLevel > 85 ? 'overflow' : fillLevel > 60 ? 'high' : 'normal' }
  })
}

function simulateEnergy(hour) {
  const isDay = hour >= 6 && hour <= 22
  return ENERGY_ZONES.map(zone => {
    const timeMult = isDay ? (0.7 + Math.random() * 0.6) : (0.2 + Math.random() * 0.3)
    const currentLoad = Math.round(zone.baseLoad * timeMult)
    const intensity = Math.min(1, currentLoad / (zone.baseLoad * 1.3))
    return { ...zone, currentLoad, intensity }
  })
}

// ── Haversine distance (km) ─────────────────────────────────
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Store ───────────────────────────────────────────────────
export const useCityStore = create((set, get) => ({
  // Layer visibility
  layers: { traffic: true, parking: true, waste: false, energy: false },
  toggleLayer: (key) => set(s => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),

  // Traffic — store full route coords, derive colored segments
  trafficRoutes: [],   // [{id, name, coords: [[lat,lng],...]}]
  trafficSegments: [], // derived colored segments for rendering
  trafficLevel: 0,
  fetchTrafficRoutes: async () => {
    try {
      const fetchRoute = async ({ start, end }) => {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`)
        const data = await res.json()
        if (data.routes?.[0]) return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
        return []
      }
      const results = await Promise.all(TRAFFIC_ROUTE_ENDPOINTS.map(fetchRoute))
      const routes = results.map((coords, i) => ({
        id: TRAFFIC_ROUTE_ENDPOINTS[i].id,
        name: TRAFFIC_ROUTE_ENDPOINTS[i].name,
        coords,
      })).filter(r => r.coords.length >= 2)
      set({ trafficRoutes: routes })
      get().refreshTrafficColors()
    } catch (err) { console.warn('OSRM fetch failed:', err) }
  },
  refreshTrafficColors: () => {
    const { trafficRoutes } = get()
    if (!trafficRoutes.length) return
    const hour = new Date().getHours()
    const segments = []
    let totalChunks = 0, redChunks = 0

    trafficRoutes.forEach(route => {
      if (route.coords.length < 2) return
      // Group coords into ~8 colored segments per route for smooth rendering
      const chunkSize = Math.max(3, Math.ceil(route.coords.length / 8))
      for (let i = 0; i < route.coords.length - 1; i += chunkSize) {
        const end = Math.min(i + chunkSize + 1, route.coords.length)
        const color = getTrafficColor(hour, totalChunks)
        segments.push({ positions: route.coords.slice(i, end), color })
        totalChunks++
        if (color === '#ef4444') redChunks++
      }
    })
    const trafficLevel = totalChunks ? Math.round((redChunks / totalChunks) * 100) : 0
    set({ trafficSegments: segments, trafficLevel })
  },

  // Parking
  parkingSpots: [],
  refreshParking: () => {
    const hour = new Date().getHours()
    set({ parkingSpots: PARKING_SPOTS.map(s => predictParking(s, hour)) })
  },
  suggestParking: (destLat, destLng) => {
    const { parkingSpots, trafficLevel } = get()
    if (!parkingSpots.length) return null
    const scored = parkingSpots.map(p => {
      const dist = haversine(destLat, destLng, p.lat, p.lng)
      const avail = p.available / p.capacity
      const score = (avail * 0.5) - (Math.min(dist, 5) / 5 * 0.3) - (trafficLevel / 100 * 0.2)
      return { ...p, score, distance: dist }
    }).sort((a, b) => b.score - a.score)
    return scored[0]
  },

  // Waste
  wasteBins: [],
  refreshWaste: () => set({ wasteBins: simulateWaste() }),

  // Energy
  energyZones: [],
  refreshEnergy: () => set({ energyZones: simulateEnergy(new Date().getHours()) }),

  // Weather (cached, 10-min TTL)
  weather: null,
  weatherLastFetch: 0,
  fetchWeather: async (force = false) => {
    const now = Date.now()
    if (!force && get().weather && now - get().weatherLastFetch < 600_000) return
    try {
      const res = await fetch(WEATHER_URL)
      if (!res.ok) throw new Error('Weather API error')
      const data = await res.json()
      set({ weather: data, weatherLastFetch: now })
    } catch (err) {
      console.warn('Weather fetch failed:', err)
      if (!get().weather) {
        set({ weather: { current: { temperature_2m: 28, wind_speed_10m: 8, relative_humidity_2m: 52, precipitation: 0 } }, weatherLastFetch: now })
      }
    }
  },

  // AQI
  aqi: null,
  fetchAqi: async () => {
    try {
      const res = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=23.26&longitude=77.41&current=us_aqi')
      const data = await res.json()
      if (data.current?.us_aqi) {
        const val = data.current.us_aqi
        let label = 'Good', color = '#22c55e'
        if (val > 150) { label = 'Unhealthy'; color = '#ef4444' }
        else if (val > 100) { label = 'Sensitive'; color = '#f97316' }
        else if (val > 50) { label = 'Moderate'; color = '#eab308' }
        set({ aqi: { value: val, label, color } })
      }
    } catch { set({ aqi: { value: 42, label: 'Good', color: '#22c55e' } }) }
  },

  // ── Alerts system ─────────────────────────────────────────
  getAlerts: () => {
    const { weather, aqi, trafficLevel, wasteBins, parkingSpots } = get()
    const alerts = []
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // Waste overflow alerts
    const overflowBins = wasteBins.filter(b => b.status === 'overflow')
    overflowBins.forEach(bin => {
      alerts.push({
        severity: 'critical',
        title: `🗑️ Waste Overflow — ${bin.name}`,
        summary: `Fill level at ${bin.fillLevel}%. Immediate pickup required.`,
        details: `Bin "${bin.name}" has exceeded safe capacity at ${bin.fillLevel}% fill. Sanitation team dispatch recommended. Overflow risk increases bacterial contamination in the area.`,
        location: bin.name,
        time: now,
      })
    })

    // Traffic alerts
    if (trafficLevel > 70) {
      alerts.push({
        severity: 'critical',
        title: '🚦 Heavy Traffic Congestion',
        summary: `City-wide congestion at ${trafficLevel}%. Multiple corridors affected.`,
        details: `Traffic congestion has reached ${trafficLevel}% across monitored corridors. Consider alternate routes or delay non-essential travel. Peak hours typically see 40-60% congestion.`,
        location: 'City-wide',
        time: now,
      })
    } else if (trafficLevel > 40) {
      alerts.push({
        severity: 'warning',
        title: '🚦 Moderate Traffic',
        summary: `Congestion at ${trafficLevel}%. Some corridors busy.`,
        details: `Traffic is moderately congested at ${trafficLevel}%. Main arterial roads may experience delays of 5-15 minutes.`,
        location: 'Major corridors',
        time: now,
      })
    }

    // Parking alerts
    const fullLots = parkingSpots.filter(p => p.available <= 5)
    if (fullLots.length > 0) {
      alerts.push({
        severity: 'warning',
        title: `🅿️ ${fullLots.length} Parking Lot(s) Nearly Full`,
        summary: `${fullLots.map(p => p.name).slice(0, 3).join(', ')} at capacity.`,
        details: `The following parking lots have 5 or fewer spots available: ${fullLots.map(p => `${p.name} (${p.available}/${p.capacity})`).join(', ')}. Consider alternative locations.`,
        location: fullLots[0]?.area,
        time: now,
      })
    }

    // AQI alerts
    if (aqi && aqi.value > 100) {
      alerts.push({
        severity: aqi.value > 150 ? 'critical' : 'warning',
        title: `💨 Air Quality — ${aqi.label}`,
        summary: `AQI at ${aqi.value}. ${aqi.value > 150 ? 'Avoid outdoor activity.' : 'Sensitive groups should limit exposure.'}`,
        details: `The Air Quality Index is at ${aqi.value} (${aqi.label}). ${aqi.value > 150 ? 'All citizens should minimize outdoor exposure. Use masks if going outside.' : 'People with respiratory conditions should limit prolonged outdoor exertion.'}`,
        location: 'Bhopal Metro Area',
        time: now,
      })
    }

    // Weather alerts
    const w = weather?.current
    if (w && w.precipitation > 5) {
      alerts.push({
        severity: w.precipitation > 20 ? 'critical' : 'warning',
        title: '🌧️ Heavy Rainfall Alert',
        summary: `Precipitation: ${w.precipitation}mm. Possible waterlogging.`,
        details: `Current precipitation is ${w.precipitation}mm. Low-lying areas may experience waterlogging. Drive carefully and avoid underpasses.`,
        location: 'City-wide',
        time: now,
      })
    }

    return alerts
  },

  // ── City Health Score (0-100) ─────────────────────────────
  // Composite wellness metric from all IoT domains
  getCityHealthScore: () => {
    const { trafficLevel, aqi, wasteBins, parkingSpots, weather } = get()
    const scores = []

    // Traffic (100 = no congestion, 0 = all red)
    scores.push(Math.max(0, 100 - trafficLevel))

    // AQI (100 = AQI 0, 0 = AQI 200+)
    if (aqi?.value != null) scores.push(Math.max(0, 100 - (aqi.value / 2)))

    // Waste (100 = all normal, 0 = all overflow)
    if (wasteBins.length > 0) {
      const normalPct = wasteBins.filter(b => b.status === 'normal').length / wasteBins.length
      scores.push(normalPct * 100)
    }

    // Parking (100 = all available, 0 = all full)
    if (parkingSpots.length > 0) {
      const total = parkingSpots.reduce((s, p) => s + p.capacity, 0)
      const avail = parkingSpots.reduce((s, p) => s + p.available, 0)
      scores.push(total > 0 ? (avail / total) * 100 : 50)
    }

    // Weather (rain penalty)
    const w = weather?.current
    if (w) {
      const rainPenalty = Math.min(30, (w.precipitation || 0) * 1.5)
      const heatPenalty = Math.max(0, (w.temperature_2m - 35) * 2)
      scores.push(Math.max(0, 100 - rainPenalty - heatPenalty))
    }

    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 65
    return Math.round(Math.min(100, Math.max(0, avg)))
  },

  // Build context string for AI (lean version — agents should prefer buildScopedContext)
  getCityContext: () => {
    const { weather, aqi, parkingSpots, trafficLevel, wasteBins } = get()
    const w = weather?.current
    let ctx = `\n--- LIVE BHOPAL CITY DATA ---\n`
    if (w) ctx += `Weather: ${w.temperature_2m}°C | Humidity: ${w.relative_humidity_2m}% | Wind: ${w.wind_speed_10m} km/h\n`
    if (aqi) ctx += `Air Quality: AQI ${aqi.value} (${aqi.label})\n`
    ctx += `Traffic Congestion: ${trafficLevel}%\n`
    if (parkingSpots.length) {
      const topSpots = [...parkingSpots].sort((a, b) => b.available - a.available).slice(0, 5)
      ctx += `Parking (top 5 available):\n`
      topSpots.forEach(p => { ctx += `  • ${p.name}: ${p.available}/${p.capacity} spots (${p.occupancy}% full)\n` })
    }
    const overflow = wasteBins.filter(b => b.status === 'overflow')
    if (overflow.length) ctx += `Waste Alert: ${overflow.length} bins overflowing\n`
    ctx += `City Health Score: ${get().getCityHealthScore()}/100\n`
    ctx += `---\n`
    return ctx
  },

  // Init all systems + start intervals
  _intervals: [],
  initCity: () => {
    const store = get()
    // Prevent double-init
    if (store._intervals.length > 0) return

    store.fetchWeather()
    store.fetchAqi()
    store.refreshParking()
    store.refreshWaste()
    store.refreshEnergy()
    store.fetchTrafficRoutes()

    const intervals = [
      setInterval(() => get().refreshTrafficColors(), 8000),  // Reduced from 4s to 8s
      setInterval(() => get().refreshParking(), 10000),       // Reduced from 5s to 10s
      setInterval(() => get().refreshWaste(), 20000),         // Reduced from 15s to 20s
      setInterval(() => get().refreshEnergy(), 15000),        // Reduced from 10s to 15s
      setInterval(() => get().fetchWeather(), 600_000),
    ]
    set({ _intervals: intervals })
  },
  destroyCity: () => {
    get()._intervals.forEach(clearInterval)
    set({ _intervals: [] })
  },
}))
