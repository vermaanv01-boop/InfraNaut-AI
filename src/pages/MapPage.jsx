import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMapStore } from '../stores/mapStore'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCityStore } from '../stores/cityStore'
import { supabase } from '../lib/supabase'
import { uploadReportImage } from '../lib/storage'
import { compressImage, fileToDataUrl } from '../lib/imageCompression'
import {
  BHOPAL_CENTER, BHOPAL_BOUNDS, MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM, MAP_MAX_ZOOM, REPORT_CATEGORIES, BHOPAL_WARDS
} from '../utils/constants'
import {
  X, MapPin, Upload, Loader2, Sun, Cloud, CloudRain,
  Wind, Droplets, Navigation, ZoomIn
} from 'lucide-react'

// Map layer components
import TrafficLayer from '../components/map/TrafficLayer'
import ParkingLayer from '../components/map/ParkingLayer'
import WasteLayer from '../components/map/WasteLayer'
import EnergyLayer from '../components/map/EnergyLayer'
import LayerControls from '../components/map/LayerControls'

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Helpers ───────────────────────────────────────────────────────

function createCategoryIcon(category) {
  const cat = REPORT_CATEGORIES.find(c => c.id === category) || REPORT_CATEGORIES[5]
  return L.divIcon({
    html: `<div style="
      background:${cat.color};
      width:32px;height:32px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2.5px solid white;
      box-shadow:0 3px 12px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      transition:transform 0.2s;
    "><span style="transform:rotate(45deg);font-size:13px;">${cat.emoji}</span></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  })
}

function createPinIcon() {
  return L.divIcon({
    html: `<div style="
      width:20px;height:20px;
      border-radius:50%;
      background:#3b82f6;
      border:3px solid white;
      box-shadow:0 0 0 3px rgba(59,130,246,0.35),0 3px 10px rgba(0,0,0,0.3);
      animation: locatePulse 1.5s infinite;
    "></div>
    <style>
      @keyframes locatePulse {
        0%,100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.35),0 3px 10px rgba(0,0,0,0.3); }
        50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.15),0 3px 10px rgba(0,0,0,0.3); }
      }
    </style>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

/** Returns weather icon emoji based on weather code */
function getWeatherIcon(code, precipitation) {
  if (precipitation > 1) return { icon: CloudRain, color: 'text-blue-400', label: 'Rain' }
  if (code >= 80) return { icon: CloudRain, color: 'text-blue-400', label: 'Showers' }
  if (code >= 45) return { icon: Cloud, color: 'text-slate-400', label: 'Cloudy' }
  return { icon: Sun, color: 'text-amber-400', label: 'Clear' }
}

// ── Inner map components ──────────────────────────────────────────

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

/** Renders children via portal directly into Leaflet's container DOM node.
 * This puts overlays in Leaflet's own stacking context so z-index works correctly. */
function LeafletPortal({ children }) {
  const map = useMap()
  return createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 900, pointerEvents: 'none' }}>
      {children}
    </div>,
    map.getContainer()
  )
}

function LocateMeButton() {
  const map = useMap()
  const [locating, setLocating] = useState(false)

  const locate = () => {
    setLocating(true)
    map.locate({ setView: true, maxZoom: 15, timeout: 6000 })
    map.once('locationfound', () => setLocating(false))
    map.once('locationerror', () => setLocating(false))
  }

  return (
    <div style={{ position: 'absolute', bottom: 24, right: 16, pointerEvents: 'auto' }}>
      <button
        onClick={locate}
        title="Locate Me"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
        style={{
          background: locating ? '#1d4ed8' : '#3b82f6',
          boxShadow: locating ? '0 0 0 3px rgba(59,130,246,0.4)' : '0 2px 10px rgba(0,0,0,0.3)',
        }}
      >
        {locating
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Navigation size={16} />
        }
      </button>
    </div>
  )
}

function FitBoundsButton() {
  const map = useMap()
  return (
    <div style={{ position: 'absolute', bottom: 72, right: 16, pointerEvents: 'auto' }}>
      <button
        onClick={() => map.flyTo(BHOPAL_CENTER, MAP_DEFAULT_ZOOM, { animate: true, duration: 1 })}
        title="Reset View"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-white bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all active:scale-95"
      >
        <ZoomIn size={15} />
      </button>
    </div>
  )
}

/** Themed tile layer — reactively switches between CartoDB light/dark */
function ThemedTileLayer() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return isDark ? (
    <TileLayer
      key="dark"
      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
      subdomains="abcd"
      maxZoom={20}
    />
  ) : (
    <TileLayer
      key="light"
      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
      subdomains="abcd"
      maxZoom={20}
    />
  )
}

// ── Weather Widget ────────────────────────────────────────────────

function WeatherWidget({ weather }) {
  const w = weather?.current
  if (!w) return null
  const { icon: WeatherIcon, color, label } = getWeatherIcon(w.weather_code, w.precipitation)

  return (
    <div
      style={{
        background: 'rgba(8,15,30,0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '10px 14px',
        minWidth: 160,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Weather</span>
        <div className="flex items-center gap-1.5">
          <WeatherIcon size={14} className={color} />
          <span className={`text-[10px] font-medium ${color}`}>{label}</span>
        </div>
      </div>

      {/* Temp — big */}
      <div className="text-2xl font-bold text-white mb-2 flex items-end gap-1">
        {w.temperature_2m}
        <span className="text-sm text-slate-400 mb-0.5">°C</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Droplets size={10} className="text-blue-400" />
          <span>{w.relative_humidity_2m}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Wind size={10} className="text-cyan-400" />
          <span>{w.wind_speed_10m} km/h</span>
        </div>
        {w.precipitation > 0 && (
          <div className="col-span-2 flex items-center gap-1.5 text-blue-300">
            <CloudRain size={10} />
            <span>{w.precipitation} mm rain</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-slate-700/50 text-[9px] text-slate-500 text-center">
        Bhopal · Live Data
      </div>
    </div>
  )
}

// ── Main MapPage ──────────────────────────────────────────────────

export default function MapPage() {
  const { user } = useAuthStore()
  const { reports, fetchReports, addReport, filters, setFilters, subscribeToReports } = useMapStore()
  const { awardPoints } = usePointsStore()
  const layers = useCityStore(s => s.layers)
  const weather = useCityStore(s => s.weather)
  const initCity = useCityStore(s => s.initCity)
  const destroyCity = useCityStore(s => s.destroyCity)

  const [showForm, setShowForm] = useState(false)
  const [pinLocation, setPinLocation] = useState(null)
  const [form, setForm] = useState({ category: 'garbage', description: '', zone: BHOPAL_WARDS[0] })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    fetchReports()
    initCity()
    const unsub = subscribeToReports()
    return () => { unsub(); destroyCity() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMapClick = useCallback((e) => {
    if (showForm) setPinLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
  }, [showForm])

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      if (!file.type.startsWith('image/')) { setError('Please select an image file (jpg, png, etc.)'); return }
      if (file.size > 30 * 1024 * 1024) { setError('Image too large. Max 30MB.'); return }
      const compressed = await compressImage(file)
      const preview = await fileToDataUrl(compressed)
      setImageFile(compressed)
      setImagePreview(preview)
    } catch (err) {
      setError(err.message || 'Failed to process image')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pinLocation) { setError('Click the map to set location'); return }
    if (!form.description.trim()) { setError('Please describe the issue'); return }
    if (!imageFile) { setError('Photo proof is required.'); return }

    setError(''); setSubmitting(true)
    try {
      // Dual-strategy upload: backend first, Supabase Storage fallback
      const { url: publicUrl, source } = await uploadReportImage(imageFile)
      if (source === 'supabase') {
        console.info('[InfraNaut] Image stored via Supabase Storage (backend offline)')
      }

      const { data: report, error: reportErr } = await supabase.from('reports')
        .insert({
          user_id: user.id, category: form.category, description: form.description,
          image_url: publicUrl, latitude: pinLocation.lat, longitude: pinLocation.lng,
          zone: form.zone, status: 'pending'
        })
        .select().single()

      if (reportErr) throw reportErr
      addReport(report)
      await awardPoints(user.id, 'REPORT_SUBMITTED', report.id)

      setSubmitSuccess(true)
      setTimeout(() => {
        setShowForm(false); setPinLocation(null)
        setForm({ category: 'garbage', description: '', zone: BHOPAL_WARDS[0] })
        setImageFile(null); setImagePreview(null)
        setSubmitSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err.message || 'Submission failed. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredReports = reports.filter(r =>
    (filters.categories.length === 0 || filters.categories.includes(r.category)) &&
    (!filters.status || r.status === filters.status)
  )

  const toggleCat = (id) => setFilters({
    categories: filters.categories.includes(id)
      ? filters.categories.filter(c => c !== id)
      : [...filters.categories, id]
  })

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">City Intelligence Map</h1>
          <p className="text-slate-500 text-xs mt-0.5">Bhopal · Live IoT Telemetry &amp; Citizen Reports</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) setPinLocation(null) }}
          className={`btn-primary text-xs py-2 px-4 transition-all ${showForm ? 'bg-red-500 hover:bg-red-600' : ''}`}
        >
          <MapPin size={13} /> {showForm ? 'Cancel' : 'Report Issue'}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1.5">
        {REPORT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCat(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              filters.categories.includes(cat.id)
                ? 'text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            style={filters.categories.includes(cat.id) ? { background: cat.color } : {}}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Pin hint */}
      {showForm && (
        <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 transition-all ${
          pinLocation
            ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-400'
            : 'bg-primary-50 border border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800/30 dark:text-primary-400'
        }`}>
          <MapPin size={12} />
          {pinLocation ? '📍 Location pinned — fill the form and submit' : '👆 Click anywhere on the map to drop a pin'}
        </div>
      )}

      {/* Map + Form Grid */}
      <div className="grid lg:grid-cols-3 gap-4 relative">

        {/* Map */}
        <div
          className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'} relative rounded-2xl overflow-hidden`}
          style={{ height: 'min(480px, calc(100vh - 240px))', boxShadow: '0 4px 30px rgba(0,0,0,0.15)' }}
        >
            <MapContainer
              center={BHOPAL_CENTER}
              zoom={MAP_DEFAULT_ZOOM}
              minZoom={MAP_MIN_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
              maxBounds={BHOPAL_BOUNDS}
              maxBoundsViscosity={0.85}
              scrollWheelZoom
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <ThemedTileLayer />
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Overlays via portal — injected into Leaflet's container so z-index works */}
              <LeafletPortal>
                <div style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'auto' }}>
                  <LayerControls isPortal />
                </div>
                <div style={{ position: 'absolute', top: 16, right: 16, pointerEvents: 'none' }}>
                  <WeatherWidget weather={weather} isPortal />
                </div>
              </LeafletPortal>

              <LocateMeButton />
              <FitBoundsButton />

              {/* IoT Layers */}
              {layers.traffic && <TrafficLayer />}
              {layers.parking && <ParkingLayer />}
              {layers.waste   && <WasteLayer />}
              {layers.energy  && <EnergyLayer />}

              {/* Citizen Reports */}
              {filteredReports.map(report => (
                <Marker
                  key={report.id}
                  position={[report.latitude, report.longitude]}
                  icon={createCategoryIcon(report.category)}
                >
                  <Popup maxWidth={220}>
                    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginBottom: 8, paddingBottom: 6,
                        borderBottom: '1px solid #e2e8f0',
                      }}>
                        <span style={{ fontSize: 16 }}>
                          {REPORT_CATEGORIES.find(c => c.id === report.category)?.emoji}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                            {report.category}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{report.zone}</div>
                        </div>
                        <div style={{
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          borderRadius: 20,
                          fontSize: 9, fontWeight: 600,
                          background: report.status === 'verified' ? '#dcfce7' : '#f1f5f9',
                          color: report.status === 'verified' ? '#16a34a' : '#64748b',
                        }}>
                          {report.status}
                        </div>
                      </div>
                      <p style={{ color: '#334155', marginBottom: 6, lineHeight: 1.5 }}>{report.description}</p>
                      {report.image_url && (
                        <img
                          src={report.image_url}
                          alt="Report"
                          style={{ width: '100%', borderRadius: 8, maxHeight: 100, objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Drop pin */}
              {pinLocation && (
                <Marker position={[pinLocation.lat, pinLocation.lng]} icon={createPinIcon()} />
              )}
            </MapContainer>
        </div>

        {/* Report Form */}
        {showForm && (
          <div className="card animate-fade-in overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Report Infrastructure Issue</h3>
              <button
                onClick={() => { setShowForm(false); setPinLocation(null) }}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 animate-fade-in">
                <div className="text-4xl">✅</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">Report Submitted!</div>
                <div className="text-xs text-slate-400">+10 points earned</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── STEP 1: PIN LOCATION (always shown at top, most prominent) */}
                <div className={`rounded-xl border-2 p-3 transition-all ${
                  pinLocation
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-amber-500/50 bg-amber-500/5 animate-pulse-slow'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      pinLocation ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                    }`}>1</div>
                    <span className={`text-xs font-semibold ${pinLocation ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {pinLocation ? 'Location Pinned ✓' : 'Pin Location on Map (Required)'}
                    </span>
                  </div>

                  {pinLocation ? (
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPinLocation(null)}
                        className="text-[10px] text-red-400 hover:text-red-500 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        👆 <strong>Click anywhere on the map</strong> to drop a pin at the issue location.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!navigator.geolocation) return
                          navigator.geolocation.getCurrentPosition(
                            pos => setPinLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                            () => {}
                          )
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <Navigation size={11} /> Use my current location instead
                      </button>
                    </div>
                  )}
                </div>

                {/* ── STEP 2: Details (visually dimmed until location is pinned) */}
                <div className={`space-y-3 transition-opacity duration-300 ${!pinLocation ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">2</div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fill Issue Details</span>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">Category</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {REPORT_CATEGORIES.map(cat => (
                        <button
                          type="button" key={cat.id}
                          onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                          className={`text-[10px] py-2 px-1 rounded-lg font-medium border transition-all ${
                            form.category === cat.id
                              ? 'border-primary-500 text-primary-700 dark:text-primary-400'
                              : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300'
                          }`}
                          style={form.category === cat.id ? { background: cat.color + '18' } : {}}
                        >
                          {cat.emoji} {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zone */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Zone</label>
                    <select
                      className="inp text-xs py-2"
                      value={form.zone}
                      onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                    >
                      {BHOPAL_WARDS.map(w => <option key={w}>{w}</option>)}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Description</label>
                    <textarea
                      className="inp text-xs py-2 resize-none"
                      rows={3}
                      placeholder="Describe the issue clearly..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Photo */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                      Photo Proof <span className="text-red-500">* Required</span>
                    </label>
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="preview" className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
                          className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 rounded-full p-1 shadow transition-colors"
                        >
                          <X size={11} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 rounded-xl py-5 flex flex-col items-center gap-1.5 text-slate-400 transition-colors bg-slate-50/50 dark:bg-slate-900/30"
                      >
                        <Upload size={18} />
                        <span className="text-xs font-medium">Upload photo</span>
                        <span className="text-[10px]">jpg, png, webp · max 30MB</span>
                      </button>
                    )}
                    <input
                      ref={fileRef} type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full justify-center text-xs py-2.5"
                  disabled={submitting || !pinLocation}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  {submitting ? 'Submitting...' : !pinLocation ? '← Pin location on map first' : 'Submit & Earn 10 Points'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
