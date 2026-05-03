import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCityStore } from '../stores/cityStore'
import {
  Leaf, Thermometer, Car, ParkingMeter, Trash2, Zap,
  X, Bell, MapPin, Clock, ChevronRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import PredictiveInsights from '../components/dashboard/PredictiveInsights'

/* ═══════════════════════════════════════════════════════════
   ALERT MODAL
   ═══════════════════════════════════════════════════════════ */
function AlertItem({ alert, index }) {
  const [expanded, setExpanded] = useState(false)
  const sev = alert.severity
  const borderCls = sev === 'critical' ? 'border-red-500/40' : sev === 'warning' ? 'border-amber-500/40' : 'border-cyan-500/30'
  const bgCls = sev === 'critical' ? 'bg-red-500/5' : sev === 'warning' ? 'bg-amber-500/5' : 'bg-cyan-500/5'
  const dotCls = sev === 'critical' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'

  return (
    <div
      className={`border p-3 cursor-pointer transition-all hover:bg-white/5 ${borderCls} ${bgCls} animate-fade-in`}
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
        className="relative bg-[#0b1426] border border-cyan-500/30 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-fade-in-up"
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
          <button onClick={onClose} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
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
   REUSABLE PANEL
   ═══════════════════════════════════════════════════════════ */
function Panel({ title, children, extra, className = '' }) {
  return (
    <div className={`dashboard-panel mb-4 ${className}`}>
      <div className="flex justify-between items-center mb-1.5 px-1">
        <h3 className="text-[13px] font-medium text-white tracking-wide">{title}</h3>
        {extra}
      </div>
      <div className="relative bg-[#061121]/70 border border-cyan-900/40 backdrop-blur-sm p-3">
        {/* Futuristic corners */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/60" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/60" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/60" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/60" />
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'text-cyan-400' }) {
  return (
    <div className="flex items-center gap-2.5 p-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
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
  const navigate = useNavigate()
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

  const timeStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')} ${currentTime.toLocaleTimeString('en-US', { hour12: false })}`

  return (
    <div className="relative min-h-screen -m-4 md:-m-8 bg-black overflow-hidden font-sans text-slate-200 flex flex-col">

      {/* Background image + dark overlay */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2000&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060b14]/80 via-[#060b14]/50 to-[#060b14]/90 pointer-events-none" />

      {/* ── TOP BAR ────────────────────────────────────────── */}
      <div className="relative z-10 w-full px-4 py-2 flex items-center justify-between bg-gradient-to-b from-[#0b1426]/90 to-transparent">
        <div className="text-white font-bold tracking-widest text-sm">Bhopal IOC</div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-cyan-100">
          <span>{timeStr}</span>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">☀ Day</span>
            <span className="text-slate-400">Noon</span>
            <span className="text-slate-400">Dusk</span>
            <span className="text-slate-400">Night</span>
          </div>
          <span className="font-bold">{w?.temperature_2m ?? '24.5'}°C</span>
        </div>
      </div>

      {/* ── CENTER STATS ROW ───────────────────────────────── */}
      <div className="relative z-10 w-full flex justify-center pt-2 pb-6">
        <div className="flex items-center gap-8 md:gap-12 lg:gap-20 text-center">

          <div className="flex flex-col items-center justify-center -mt-4">
            <button
              onClick={() => setShowAlerts(true)}
              className="relative w-20 h-20 rounded-full bg-[#1e88e5] border-2 border-[#64b5f6] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(30,136,229,0.7)] hover:shadow-[0_0_30px_rgba(30,136,229,0.9)] transition-all z-20 cursor-pointer"
            >
              <span className="text-white font-bold text-sm">Alerts</span>
            </button>
          </div>

          <div>
            <div className="text-xs text-slate-300 font-medium mb-1">Building Mgmt</div>
            <div className="text-xs text-slate-400">Alerts</div>
            <div className="text-2xl font-bold text-white mt-1 tracking-wider">{activeAlerts}</div>
          </div>

          <div>
            <div className="text-xs text-slate-300 font-medium mb-1">Envir Monitoring</div>
            <div className="text-xs text-slate-400">Notifications</div>
            <div className="text-2xl font-bold text-white mt-1 tracking-wider">56</div>
          </div>

        </div>
      </div>

      {/* ── FLOATING COLUMNS ───────────────────────────────── */}
      <div className="relative z-10 flex-1 w-full px-4 flex justify-between pointer-events-none pb-4">

        {/* LEFT COLUMN */}
        <div className="w-[340px] flex flex-col gap-2 pointer-events-auto overflow-y-auto custom-scrollbar pr-2 h-[calc(100vh-140px)]">

          {/* Air Quality */}
          <Panel title="Air Quality">
            <div className="flex gap-3 h-24">
              <div className="bg-[#1e88e5] w-24 flex flex-col items-center justify-center text-white">
                <Leaf size={28} className="mb-1" />
                <div className="text-sm font-bold uppercase">{aqi?.label || 'GOOD'}</div>
                <div className="text-[10px] opacity-90">Quality</div>
              </div>
              <div className="flex-1 flex flex-col justify-center text-xs">
                <div className="flex items-center gap-2 mb-2 text-[#64b5f6]">
                  <Thermometer size={14} />
                  <span className="text-lg font-bold text-white">Temp {w?.temperature_2m ?? '—'}°C</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-[10px] text-cyan-200">
                  <span>Wind {w?.wind_speed_10m ?? '—'}</span>
                  <span>Humidity {w?.relative_humidity_2m ?? '—'}%</span>
                  <span className="col-span-2">PM2.5 {(aqi?.value * 0.25 || 12).toFixed(2)} ug/m³</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* IoT Status (Replacing Water Quality) */}
          <Panel title="IoT Status">
            <div className="grid grid-cols-2 gap-2 h-24">
              <StatCard icon={Car} label="Congestion" value={`${trafficLevel}%`} color={trafficLevel > 60 ? 'text-red-400' : trafficLevel > 30 ? 'text-amber-400' : 'text-[#64b5f6]'} />
              <StatCard icon={ParkingMeter} label="Spots Avail" value={totalAvail} color="text-[#64b5f6]" />
              <StatCard icon={Trash2} label="Overflows" value={overflowBins} color={overflowBins > 0 ? 'text-red-400' : 'text-[#64b5f6]'} />
              <StatCard icon={Zap} label="Grid Load" value={<>8.9 <span className="text-[8px]">MW</span></>} color="text-[#64b5f6]" />
            </div>
          </Panel>

          {/* Traffic Trend (Replacing Water Quality Trend) */}
          <Panel title="Traffic Trend">
            <div className="flex justify-end gap-3 mb-2 text-[9px] text-cyan-200">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#1e88e5]" /> Traffic</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#26a69a]" /> Parking</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#ab47bc]" /> Waste</span>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: 10 }} />
                  <Bar dataKey="Traffic" fill="#1e88e5" barSize={4} />
                  <Bar dataKey="Parking" fill="#26a69a" barSize={4} />
                  <Bar dataKey="Waste" fill="#ab47bc" barSize={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

        </div>

        {/* CENTER COLUMN - PREDICTIVE INSIGHTS */}
        <div className="w-[420px] flex flex-col gap-2 pointer-events-auto h-[calc(100vh-140px)] animate-fade-in-up">
          <div className="bg-[#0b1426]/90 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.2)] flex-1 overflow-hidden p-3 relative flex flex-col rounded-sm">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            
            <PredictiveInsights />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-[340px] flex flex-col gap-2 pointer-events-auto overflow-y-auto custom-scrollbar pl-2 h-[calc(100vh-140px)]">

          {/* Weather Simulation */}
          <Panel title="Weather Simulation">
            <div className="grid grid-cols-2 gap-3 p-1">
              {['Sunny', 'Fog', 'Rain', 'Snow'].map((w_type, i) => (
                <button key={w_type} className={`py-2 text-xs font-bold tracking-wider text-cyan-100 border border-[#1e88e5] rounded-[20px] bg-[#1e88e5]/10 hover:bg-[#1e88e5]/30 transition-colors ${i === 0 ? 'shadow-[0_0_10px_rgba(30,136,229,0.5)] bg-[#1e88e5]/30' : ''}`}>
                  {w_type}
                </button>
              ))}
            </div>
          </Panel>

          {/* Parking Overview (Replacing Weekly Covid Case) */}
          <Panel title="Parking Overview" extra={
            <button onClick={() => navigate('/app/map')} className="text-[10px] bg-[#1e88e5] hover:bg-[#1565c0] transition-colors text-white px-3 py-1 font-medium rounded-sm cursor-pointer">
              Track
            </button>
          }>
            <div className="h-32 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parkingChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: 10 }} />
                  <Bar dataKey="Available" fill="#1e88e5" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Environment Data */}
          <Panel title="Environment Data">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-[11px]">
                <thead>
                  <tr className="text-white border-b border-cyan-900/40">
                    <th className="pb-2 font-medium">Sensor</th>
                    <th className="pb-2 font-medium">°C</th>
                    <th className="pb-2 font-medium">Humidity</th>
                    <th className="pb-2 font-medium">CO2(PPM)</th>
                  </tr>
                </thead>
                <tbody className="text-cyan-100">
                  {['J01', 'J02', 'J03', 'J04', 'J05'].map((sensor, i) => (
                    <tr key={sensor} className="border-b border-cyan-900/20 hover:bg-white/5 transition-colors">
                      <td className="py-2">{sensor}</td>
                      <td className="py-2">{w ? (w.temperature_2m - (i * 0.2)).toFixed(1) : '27.6'}</td>
                      <td className="py-2">{w ? (w.relative_humidity_2m + (i * 0.5)).toFixed(1) : '49.7'}</td>
                      <td className="py-2">{611 - (i * 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

        </div>
      </div>

      {/* ── ALERT MODAL ────────────────────────────────────── */}
      {showAlerts && <AlertModal onClose={() => setShowAlerts(false)} />}
    </div>
  )
}
