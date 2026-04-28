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
  // Rush hours → more red; night → green
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

  // Traffic
  trafficSegments: [],
  trafficLevel: 0,       // 0-100
  fetchTrafficRoutes: async () => {
    try {
      const fetchRoute = async ({ start, end }) => {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`)
        const data = await res.json()
        if (data.routes?.[0]) return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
        return []
      }
      const results = await Promise.all(TRAFFIC_ROUTE_ENDPOINTS.map(fetchRoute))
      const hour = new Date().getHours()
      const segments = []
      results.forEach(coords => {
        for (let i = 0; i < coords.length - 1; i++) {
          segments.push({ positions: [coords[i], coords[i + 1]], color: getTrafficColor(hour, i) })
        }
      })
      const red = segments.filter(s => s.color === '#ef4444').length
      const trafficLevel = segments.length ? Math.round((red / segments.length) * 100) : 0
      set({ trafficSegments: segments, trafficLevel })
    } catch (err) { console.warn('OSRM fetch failed:', err) }
  },
  refreshTrafficColors: () => {
    const { trafficSegments } = get()
    if (!trafficSegments.length) return
    const hour = new Date().getHours()
    const updated = trafficSegments.map((seg, i) => ({ ...seg, color: getTrafficColor(hour, i) }))
    const red = updated.filter(s => s.color === '#ef4444').length
    set({ trafficSegments: updated, trafficLevel: Math.round((red / updated.length) * 100) })
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

  // Build context string for AI
  getCityContext: () => {
    const { weather, aqi, parkingSpots, trafficLevel, wasteBins } = get()
    const w = weather?.current
    let ctx = `\n--- LIVE BHOPAL CITY DATA ---\n`
    if (w) ctx += `Weather: ${w.temperature_2m}°C | Humidity: ${w.relative_humidity_2m}% | Wind: ${w.wind_speed_10m} km/h\n`
    if (aqi) ctx += `Air Quality: AQI ${aqi.value} (${aqi.label})\n`
    ctx += `Traffic Congestion: ${trafficLevel}%\n`
    if (parkingSpots.length) {
      ctx += `Parking:\n`
      parkingSpots.forEach(p => { ctx += `  • ${p.name}: ${p.available}/${p.capacity} spots (${p.occupancy}% full)\n` })
    }
    const overflow = wasteBins.filter(b => b.status === 'overflow')
    if (overflow.length) ctx += `Waste Alert: ${overflow.length} bins overflowing\n`
    ctx += `---\n`
    return ctx
  },

  // Init all systems + start intervals
  _intervals: [],
  initCity: () => {
    const store = get()
    store.fetchWeather()
    store.fetchAqi()
    store.refreshParking()
    store.refreshWaste()
    store.refreshEnergy()
    store.fetchTrafficRoutes()

    const intervals = [
      setInterval(() => get().refreshTrafficColors(), 4000),
      setInterval(() => get().refreshParking(), 5000),
      setInterval(() => get().refreshWaste(), 15000),
      setInterval(() => get().refreshEnergy(), 10000),
      setInterval(() => get().fetchWeather(), 600_000),
    ]
    set({ _intervals: intervals })
  },
  destroyCity: () => {
    get()._intervals.forEach(clearInterval)
    set({ _intervals: [] })
  },
}))
