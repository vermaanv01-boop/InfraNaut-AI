import { useState, useEffect } from 'react'
import { useCityStore } from '../stores/cityStore'
import { Activity, Thermometer, Wind, Droplets, Car, ParkingMeter, Trash2 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function StatCard({ icon: Icon, iconColor, iconBg, label, value, unit }) {
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 ${iconBg} rounded-lg`}><Icon size={20} className={iconColor} /></div>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      </div>
      <div className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {value}<span className="text-2xl text-slate-400 font-medium">{unit}</span>
      </div>
    </div>
  )
}

function IoTCard({ icon: Icon, color, bg, label, value, status }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-xl ${bg}`}><Icon size={26} className={color} /></div>
        <span className="text-xs font-bold px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-100 dark:border-slate-700">{status}</span>
      </div>
      <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-sm font-medium text-slate-500 mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const weather = useCityStore(s => s.weather)
  const aqi = useCityStore(s => s.aqi)
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const parkingSpots = useCityStore(s => s.parkingSpots)
  const wasteBins = useCityStore(s => s.wasteBins)
  const initCity = useCityStore(s => s.initCity)
  const destroyCity = useCityStore(s => s.destroyCity)
  const [trafficHistory, setTrafficHistory] = useState([])
  const [parkingHistory, setParkingHistory] = useState([])

  useEffect(() => { initCity(); return () => destroyCity() }, [])

  useEffect(() => {
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setTrafficHistory(p => [...p, { time: t, congestion: trafficLevel }].slice(-12))
  }, [trafficLevel])

  useEffect(() => {
    if (!parkingSpots.length) return
    const avail = parkingSpots.reduce((s, p) => s + p.available, 0)
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setParkingHistory(p => [...p, { time: t, available: avail }].slice(-12))
  }, [parkingSpots])

  const w = weather?.current
  const totalAvail = parkingSpots.reduce((s, p) => s + p.available, 0)
  const totalCap = parkingSpots.reduce((s, p) => s + p.capacity, 0)
  const overflowBins = wasteBins.filter(b => b.status === 'overflow').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">City Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time telemetry and infrastructure status</p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-full border border-teal-100 dark:border-teal-800/30 flex items-center gap-2 w-fit">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> System Online
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Thermometer} iconColor="text-orange-500" iconBg="bg-orange-50 dark:bg-orange-900/20" label="Temperature" value={w ? `${w.temperature_2m}` : '--'} unit="°C" />
        <StatCard icon={Wind} iconColor="text-blue-500" iconBg="bg-blue-50 dark:bg-blue-900/20" label="Wind Speed" value={w ? `${w.wind_speed_10m}` : '--'} unit=" km/h" />
        <StatCard icon={Droplets} iconColor="text-cyan-500" iconBg="bg-cyan-50 dark:bg-cyan-900/20" label="Humidity" value={w ? `${w.relative_humidity_2m}` : '--'} unit="%" />
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Activity size={20} style={{ color: aqi?.color || '#22c55e' }} /></div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Air Quality</span>
          </div>
          <div className="text-4xl font-extrabold tracking-tight" style={{ color: aqi?.color || '#22c55e' }}>
            {aqi?.value || '--'} <span className="text-sm font-semibold ml-1">{aqi?.label || 'Good'}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2 pb-5">IoT Sensor Network</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <IoTCard icon={Car} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-900/20" label="Traffic Congestion" value={`${trafficLevel}%`} status={trafficLevel > 60 ? 'Heavy' : trafficLevel > 30 ? 'Moderate' : 'Light'} />
          <IoTCard icon={ParkingMeter} color="text-green-500" bg="bg-green-50 dark:bg-green-900/20" label="Parking Available" value={`${totalAvail} / ${totalCap}`} status={totalAvail > 500 ? 'Good' : 'Limited'} />
          <IoTCard icon={Trash2} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" label="Waste Bins" value={`${overflowBins} overflow`} status={overflowBins > 3 ? 'Alert' : 'Normal'} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Traffic Congestion Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trafficHistory}>
              <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="congestion" stroke="#3b82f6" fill="url(#tg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Parking Availability</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={parkingHistory}>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="available" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
