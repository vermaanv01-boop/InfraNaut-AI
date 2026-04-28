import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMapStore } from '../stores/mapStore'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCityStore } from '../stores/cityStore'
import { supabase } from '../lib/supabase'
import { compressImage, fileToDataUrl } from '../lib/imageCompression'
import { BHOPAL_CENTER, BHOPAL_BOUNDS, MAP_DEFAULT_ZOOM, MAP_MIN_ZOOM, MAP_MAX_ZOOM, REPORT_CATEGORIES, BHOPAL_WARDS } from '../utils/constants'
import { X, MapPin, Upload, Loader2, Sun } from 'lucide-react'

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

function createCategoryIcon(category) {
  const cat = REPORT_CATEGORIES.find(c => c.id === category) || REPORT_CATEGORIES[5]
  return L.divIcon({
    html: `<div style="background:${cat.color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">${cat.emoji}</span></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })
}

function MapClickHandler({ onMapClick }) {
  const map = useMap()
  useEffect(() => {
    map.on('click', onMapClick)
    return () => map.off('click', onMapClick)
  }, [map, onMapClick])
  return null
}

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
  const fileRef = useRef()

  useEffect(() => {
    fetchReports()
    initCity()
    const unsub = subscribeToReports()
    return () => { unsub(); destroyCity() }
  }, [])

  const handleMapClick = (e) => {
    if (showForm) setPinLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      // Validate type
      if (!file.type.startsWith('image/')) { setError('Please select an image file (jpg, png, etc.)'); return }
      // Validate size (30MB raw max before compression)
      if (file.size > 30 * 1024 * 1024) { setError('Image too large. Max 30MB.'); return }
      const compressed = await compressImage(file)
      const preview = await fileToDataUrl(compressed)
      setImageFile(compressed)
      setImagePreview(preview)
    } catch (err) {
      console.error('Image compression error:', err)
      setError(err.message || 'Failed to process image')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pinLocation) { setError('Click the map to set location'); return }
    if (!form.description.trim()) { setError('Please describe the issue'); return }
    if (!imageFile) { setError('Photo proof is required to submit a report.'); return }

    setError(''); setSubmitting(true)
    try {
      const path = `reports/${user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage.from('report-images').upload(path, imageFile, { contentType: 'image/jpeg' })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      const { data: { publicUrl } } = supabase.storage.from('report-images').getPublicUrl(path)

      const { data: report, error: reportErr } = await supabase.from('reports')
        .insert({ user_id: user.id, category: form.category, description: form.description, image_url: publicUrl, latitude: pinLocation.lat, longitude: pinLocation.lng, zone: form.zone, status: 'pending' })
        .select().single()

      if (reportErr) throw reportErr
      addReport(report)
      await awardPoints(user.id, 'REPORT_SUBMITTED', report.id)

      // Reset form
      setShowForm(false); setPinLocation(null)
      setForm({ category: 'garbage', description: '', zone: BHOPAL_WARDS[0] })
      setImageFile(null); setImagePreview(null)
    } catch (err) {
      console.error('Report submission error:', err)
      setError(err.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  const filteredReports = reports.filter(r =>
    (filters.categories.length === 0 || filters.categories.includes(r.category)) &&
    (!filters.status || r.status === filters.status)
  )

  const toggleCat = (id) => setFilters({
    categories: filters.categories.includes(id) ? filters.categories.filter(c => c !== id) : [...filters.categories, id]
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">City Intelligence Map</h1>
          <p className="text-slate-500 text-xs mt-0.5">Bhopal · Live IoT Telemetry & Citizen Reports</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) setPinLocation(null) }} className="btn-primary text-xs py-2 px-4">
          <MapPin size={13} /> {showForm ? 'Cancel Report' : 'Report Issue'}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {REPORT_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => toggleCat(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filters.categories.includes(cat.id) ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-500' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="text-xs text-primary-700 bg-primary-50 border border-primary-200 dark:bg-primary-900/20 dark:border-primary-800/30 dark:text-primary-400 rounded-lg px-3 py-2">
          {pinLocation ? `📍 Location set — fill form below` : '👆 Click on the map to pin the issue location'}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 relative">
        <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'} style={{ height: '520px', position: 'relative' }}>

          {/* Weather Widget */}
          {weather?.current && (
            <div className="absolute top-4 right-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs min-w-[140px] pointer-events-none">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">Weather</span>
                <Sun size={14} className="text-amber-500" />
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Temp</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{weather.current.temperature_2m}°C</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Humidity</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{weather.current.relative_humidity_2m}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wind</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{weather.current.wind_speed_10m} km/h</span>
              </div>
            </div>
          )}

          {/* Layer Controls */}
          <LayerControls />

          <MapContainer center={BHOPAL_CENTER} zoom={MAP_DEFAULT_ZOOM} minZoom={MAP_MIN_ZOOM} maxZoom={MAP_MAX_ZOOM} maxBounds={BHOPAL_BOUNDS} maxBoundsViscosity={1.0} scrollWheelZoom={true} style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 10 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            <MapClickHandler onMapClick={handleMapClick} />

            {/* Isolated Layers */}
            {layers.traffic && <TrafficLayer />}
            {layers.parking && <ParkingLayer />}
            {layers.waste   && <WasteLayer />}
            {layers.energy  && <EnergyLayer />}

            {/* User Reports */}
            {filteredReports.map(report => (
              <Marker key={report.id} position={[report.latitude, report.longitude]} icon={createCategoryIcon(report.category)}>
                <Popup>
                  <div className="text-xs space-y-1 min-w-[150px]">
                    <div className="font-semibold">{REPORT_CATEGORIES.find(c => c.id === report.category)?.emoji} {report.category}</div>
                    <p>{report.description}</p>
                    <div className="text-slate-500 text-[10px]">{report.zone} · {report.status}</div>
                    {report.image_url && <img src={report.image_url} alt="report" className="w-full rounded mt-1 max-h-24 object-cover" />}
                  </div>
                </Popup>
              </Marker>
            ))}

            {pinLocation && <Marker position={[pinLocation.lat, pinLocation.lng]} />}
          </MapContainer>
        </div>

        {/* Report Form */}
        {showForm && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Report Infrastructure Issue</h3>
              <button onClick={() => { setShowForm(false); setPinLocation(null) }} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {REPORT_CATEGORIES.map(cat => (
                    <button type="button" key={cat.id} onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                      className={`text-[10px] py-2 rounded-lg font-medium border transition-all ${form.category === cat.id ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Zone</label>
                <select className="inp text-xs py-2" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                  {BHOPAL_WARDS.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Description</label>
                <textarea className="inp text-xs py-2 resize-none" rows={3} placeholder="Describe the issue..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Photo Proof <span className="text-red-500">* Required</span></label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="preview" className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }} className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 rounded-full p-1"><X size={12} className="text-white" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-lg py-4 flex flex-col items-center gap-1 text-slate-500 transition-colors bg-slate-50 dark:bg-slate-900/50">
                    <Upload size={18} /><span className="text-xs font-medium">Upload photo (jpg/png, max 10MB)</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full justify-center text-xs py-2.5" disabled={submitting || !pinLocation}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                {submitting ? 'Submitting...' : 'Submit Report & Earn Points'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
