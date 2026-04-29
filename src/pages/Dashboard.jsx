import { useState, useEffect, useMemo } from 'react'
import { useCityStore } from '../stores/cityStore'
import {
  Leaf, Thermometer, Car, ParkingMeter, Trash2, Zap,
  AlertTriangle, X, Bell, Eye, MapPin, Activity, Droplets,
  Clock, ChevronRight, Radio
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area
} from 'recharts'

/* ═══════════════════════════════════════════════════════════
   ALERT MODAL — interactive, expandable alerts
   ═══════════════════════════════════════════════════════════ */
function AlertItem({ alert, index }) {
  const [expanded, setExpanded] = useState(false)
  const sev = alert.severity
  const borderCls = sev === 'critical' ? 'border-red-500/40' : sev === 'warning' ? 'border-amber-500/40' : 'border-cyan-500/30'
  const bgCls = sev === 'critical' ? 'bg-red-500/5' : sev === 'warning' ? 'bg-amber-500/5' : 'bg-cyan-500/5'
  const dotCls = sev === 'critical' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'

  return (
    <div
      className={`border rounded-xl p-3 cursor-pointer transition-all hover:bg-white/5 ${borderCls} ${bgCls} animate-fade-in`}
      onClick={() => setExpanded(!expanded)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotCls}`} style={{ animation: 'pulse 2s infinite' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-white">{alert.title}</span>
            <span className="text-[9px] text-slate-500">{alert.time}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{alert.summary}</p>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 animate-fade-in">
              <p className="text-[11px] text-slate-300 leading-relaxed">{alert.details}</p>
              {alert.location && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-cyan-400">
                  <MapPin size={10} /> {alert.location}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronRight size={12} className={`text-slate-500 mt-1 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
    </div>
  )
}

function AlertModal({ onClose }) {
  const getAlerts = useCityStore(s => s.getAlerts)
  const alerts = getAlerts()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0b1426] border border-cyan-500/30 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Active Alerts</h3>
            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-slate-400 text-sm">All systems operational</div>
              <div className="text-slate-500 text-xs mt-1">No active alerts at this time</div>
            </div>
          ) : (
            alerts.map((alert, i) => <AlertItem key={i} alert={alert} index={i} />)
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   REUSABLE PANEL — glassmorphism card with accent corners
   ═══════════════════════════════════════════════════════════ */
function Panel({ title, children, extra, className = '' }) {
  return (
    <div className={`dashboard-panel ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-white tracking-wider uppercase">{title}</h3>
        {extra}
      </div>
      <div className="relative bg-slate-900/50 border border-slate-500/20 backdrop-blur-md rounded-lg p-3">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/60 rounded-tl" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/60 rounded-tr" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/60 rounded-bl" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/60 rounded-br" />
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD — small metric display
   ═══════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, sub, color = 'text-cyan-400' }) {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
      <Icon size={20} className={color} />
      <div className="min-w-0">
        <div className="text-sm font-bold text-white leading-none">{value}</div>
        <div className="text-[9px] text-cyan-200/70 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const weather = useCityStore(s => s.weather)
  const aqi = useCityStore(s => s.aqi)
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const parkingSpots = useCityStore(s => s.parkingSpots)
  const wasteBins = useCityStore(s => s.wasteBins)
  const initCity = useCityStore(s => s.initCity)
  const destroyCity = useCityStore(s => s.destroyCity)
  const getAlerts = useCityStore(s => s.getAlerts)

  const [currentTime, setCurrentTime] = useState(new Date())
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    initCity()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => { destroyCity(); clearInterval(timer) }
  }, [])

  const w = weather?.current
  const totalAvail = parkingSpots.reduce((s, p) => s + p.available, 0)
  const overflowBins = wasteBins.filter(b => b.status === 'overflow').length
  const alerts = getAlerts()
  const activeAlerts = alerts.length

  // ── STABLE chart data — derived from live data, no infinite push ──
  const trafficChartData = useMemo(() => {
    const zones = ['MP Nagar', 'Habibganj', 'Old City', 'Kolar', 'Piplani']
    return zones.map((name, i) => ({
      name,
      Traffic: Math.max(5, Math.round(trafficLevel + Math.sin(i * 1.7) * 18)),
      Parking: parkingSpots[i * 3]?.occupancy || Math.round(40 + i * 8),
      Waste: wasteBins[i * 3]?.fillLevel || Math.round(25 + i * 10),
    }))
  }, [trafficLevel, parkingSpots, wasteBins])

  const parkingChartData = useMemo(() => {
    return parkingSpots.slice(0, 6).map(p => ({
      name: p.name.split(' ').slice(0, 2).join(' '),
      Available: p.available,
      Capacity: p.capacity,
    }))
  }, [parkingSpots])

  const timeOfDay = (() => {
    const h = currentTime.getHours()
    if (h >= 5 && h < 12) return { label: 'Morning', icon: '☀️' }
    if (h >= 12 && h < 17) return { label: 'Afternoon', icon: '🌤️' }
    if (h >= 17 && h < 20) return { label: 'Evening', icon: '🌅' }
    return { label: 'Night', icon: '🌙' }
  })()

  return (
    <div className="relative min-h-screen -m-4 md:-m-8 bg-[#060b14] overflow-hidden font-sans text-slate-200">

      {/* Background image + overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2000&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060b14]/60 via-[#060b14]/70 to-[#060b14]/95" />

      {/* ── TOP BAR ────────────────────────────────────────── */}
      <div className="relative z-10 bg-[#0b1426]/80 backdrop-blur-sm border-b border-cyan-900/50 px-3 sm:px-5 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-green-400 animate-pulse" />
          <span className="font-bold text-white tracking-wide text-[11px] sm:text-xs">Bhopal IOC</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 text-cyan-100">
          <div className="hidden sm:flex items-center gap-1.5">
            <Clock size={11} className="text-slate-400" />
            <span>{currentTime.toLocaleDateString()}</span>
            <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{timeOfDay.icon}</span>
            <span className="hidden xs:inline">{timeOfDay.label}</span>
            <span className="font-bold text-white ml-1">{w?.temperature_2m ?? '—'}°C</span>
          </div>
        </div>
      </div>

      {/* ── CENTER STATS BAR ───────────────────────────────── */}
      <div className="relative z-10 px-3 sm:px-5 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-center">
          <div className="min-w-[70px]">
            <div className="text-[10px] text-slate-400">Population</div>
            <div className="text-xl sm:text-2xl font-bold text-white">2.4M</div>
          </div>
          <div className="min-w-[70px]">
            <div className="text-[10px] text-slate-400">Vehicles</div>
            <div className="text-xl sm:text-2xl font-bold text-white">12,450</div>
          </div>

          {/* Alert button — INTERACTIVE */}
          <button
            onClick={() => setShowAlerts(true)}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-300 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.6)] hover:shadow-[0_0_25px_rgba(59,130,246,0.9)] transition-shadow">
              <Bell size={14} className="text-white mb-0.5" />
              <span className="text-white font-bold text-[10px]">Alerts</span>
              {activeAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#060b14] animate-pulse">
                  {activeAlerts}
                </span>
              )}
            </div>
          </button>

          <div className="min-w-[70px]">
            <div className="text-[10px] text-slate-400">Alerts</div>
            <div className={`text-xl sm:text-2xl font-bold ${activeAlerts > 0 ? 'text-red-400' : 'text-green-400'}`}>{activeAlerts}</div>
          </div>
          <div className="min-w-[70px]">
            <div className="text-[10px] text-slate-400">IoT Sensors</div>
            <div className="text-xl sm:text-2xl font-bold text-white">56</div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID — responsive 1/2/3 columns ──────────── */}
      <div className="relative z-10 px-3 sm:px-5 pb-6 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* ─── Air Quality Panel ────────────────────── */}
          <Panel title="Air Quality">
            <div className="flex gap-3">
              <div className="bg-[#0078d4] text-white p-3 rounded-lg flex flex-col items-center justify-center min-w-[80px]">
                <Leaf size={22} className="mb-1" />
                <div className="text-sm font-bold uppercase">{aqi?.label || 'GOOD'}</div>
                <div className="text-[9px] opacity-80">Quality</div>
              </div>
              <div className="flex-1 flex flex-col justify-center text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer size={14} className="text-cyan-400" />
                  <span className="text-lg font-bold text-white">{w?.temperature_2m ?? '—'}°C</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-[10px]">
                  <span className="text-slate-400">Temp</span>
                  <span className="text-white">{w?.temperature_2m ?? '—'}°C</span>
                  <span className="text-slate-400">Wind</span>
                  <span className="text-white">{w?.wind_speed_10m ?? '—'} km/h</span>
                  <span className="text-slate-400">Humidity</span>
                  <span className="text-white">{w?.relative_humidity_2m ?? '—'}%</span>
                  <span className="text-slate-400">AQI</span>
                  <span className="text-cyan-400 font-bold">{aqi?.value ?? '—'}</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* ─── IoT Status Panel ─────────────────────── */}
          <Panel title="IoT Status">
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard icon={Car} label="Congestion" value={`${trafficLevel}%`} color={trafficLevel > 60 ? 'text-red-400' : trafficLevel > 30 ? 'text-amber-400' : 'text-green-400'} />
              <StatCard icon={ParkingMeter} label="Spots Avail" value={totalAvail} color="text-cyan-400" />
              <StatCard icon={Trash2} label="Overflows" value={overflowBins} color={overflowBins > 0 ? 'text-red-400' : 'text-green-400'} />
              <StatCard icon={Zap} label="Grid Load" value={<>8.9 <span className="text-[8px]">MW</span></>} color="text-amber-400" />
            </div>
          </Panel>

          {/* ─── Traffic Trend Chart ──────────────────── */}
          <Panel title="Traffic Trend" extra={
            <div className="flex gap-2 text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm" /> Traffic</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-400 rounded-sm" /> Parking</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-sm" /> Waste</span>
            </div>
          }>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }} />
                  <Bar dataKey="Traffic" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={6} />
                  <Bar dataKey="Parking" fill="#22d3ee" radius={[3, 3, 0, 0]} barSize={6} />
                  <Bar dataKey="Waste" fill="#a855f7" radius={[3, 3, 0, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* ─── Parking Overview ─────────────────────── */}
          <Panel title="Parking Overview" extra={
            <span className="text-[10px] text-cyan-400 font-medium">{totalAvail} spots</span>
          }>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parkingChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }} />
                  <Bar dataKey="Capacity" fill="#334155" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="Available" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* ─── Active Alerts Panel (quick view) ────── */}
          <Panel title="Active Alerts" extra={
            <button onClick={() => setShowAlerts(true)} className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
              View All →
            </button>
          }>
            {alerts.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-xl mb-1">✅</div>
                <div className="text-[10px] text-slate-400">All systems operational</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {alerts.slice(0, 4).map((alert, i) => {
                  const dotCls = alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                  return (
                    <button
                      key={i}
                      onClick={() => setShowAlerts(true)}
                      className="flex items-center gap-2 w-full text-left p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
                      <span className="text-[10px] text-slate-300 truncate flex-1">{alert.title}</span>
                      <span className="text-[8px] text-slate-500">{alert.time}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>

          {/* ─── Environment Data Table ───────────────── */}
          <Panel title="Environment Sensors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="text-white border-b border-slate-700/50">
                    <th className="pb-1.5 pr-2">Sensor</th>
                    <th className="pb-1.5 pr-2">°C</th>
                    <th className="pb-1.5 pr-2">Humidity</th>
                    <th className="pb-1.5">CO₂ (PPM)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {['J01', 'J02', 'J03', 'J04', 'J05'].map((sensor, i) => (
                    <tr key={sensor} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                      <td className="py-1.5 pr-2 font-medium text-cyan-400">{sensor}</td>
                      <td className="py-1.5 pr-2">{w ? (w.temperature_2m - (i * 0.2)).toFixed(1) : '—'}</td>
                      <td className="py-1.5 pr-2">{w ? (w.relative_humidity_2m + (i * 0.5)).toFixed(1) : '—'}%</td>
                      <td className="py-1.5">{611 - (i * 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-[8px] text-slate-600 mt-2">Powered by InfraNaut AI</div>
          </Panel>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <div className="relative z-10 text-center pb-4">
        <span className="text-[9px] text-slate-500 tracking-widest">
          Bhopal Smart City Digital Twin · System Online
        </span>
      </div>

      {/* ── ALERT MODAL ────────────────────────────────────── */}
      {showAlerts && <AlertModal onClose={() => setShowAlerts(false)} />}
    </div>
  )
}
