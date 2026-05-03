import { useEffect, useState, useRef } from 'react'
import { useCityStore } from '../../stores/cityStore'
import {
  Brain, TrendingUp, AlertTriangle, Clock, Trash2,
  Zap, Car, CheckCircle2, ChevronRight, Radio, Activity
} from 'lucide-react'

/* ── tiny animated number hook ─────────────────────────────── */
function useAnimatedValue(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const start = prev.current
    const diff = target - start
    if (diff === 0) return
    const startTime = performance.now()
    const raf = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      setDisplay(Math.round(start + diff * ease))
      if (t < 1) requestAnimationFrame(raf)
      else prev.current = target
    }
    requestAnimationFrame(raf)
  }, [target, duration])
  return display
}

/* ── Prediction card ─────────────────────────────────────────── */
function PredictionCard({ icon: Icon, color, label, prediction, status, actionLabel, onAction, timeLeft }) {
  const borderMap = {
    red: 'border-red-500/40 bg-red-500/5',
    amber: 'border-amber-500/40 bg-amber-500/5',
    cyan: 'border-cyan-500/30 bg-cyan-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
  }
  const iconColorMap = {
    red: 'text-red-400', amber: 'text-amber-400', cyan: 'text-cyan-400',
    green: 'text-green-400', purple: 'text-purple-400',
  }
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className={`border p-3 relative overflow-hidden transition-all hover:brightness-110 ${borderMap[color] || borderMap.cyan}`}
      style={{ animation: 'fadeInUp 0.4s ease both' }}>
      {/* Animated left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${color === 'red' ? 'bg-red-500' : color === 'amber' ? 'bg-amber-500' : color === 'green' ? 'bg-green-500' : color === 'purple' ? 'bg-purple-500' : 'bg-cyan-500'}`}
        style={{ boxShadow: `0 0 8px ${color === 'red' ? '#ef4444' : color === 'amber' ? '#f59e0b' : color === 'green' ? '#22c55e' : color === 'purple' ? '#a855f7' : '#06b6d4'}` }}
      />
      <div className="flex items-start gap-2.5 pl-2">
        <div className={`mt-0.5 flex-shrink-0 ${iconColorMap[color]}`}>
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-white">{label}</span>
            {timeLeft && (
              <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1 flex-shrink-0">
                <Clock size={8} />{timeLeft}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{prediction}</p>
          {status && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${status === 'PREDICTED' ? 'bg-amber-500/20 text-amber-300' : status === 'ACTIVE' ? 'bg-red-500/20 text-red-300' : status === 'RESOLVED' ? 'bg-green-500/20 text-green-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                ● {status}
              </span>
              {actionLabel && (
                <button
                  onClick={() => { onAction?.(); setDismissed(true) }}
                  className="text-[9px] font-semibold text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5 transition-colors"
                >
                  {actionLabel} <ChevronRight size={9} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Live Metric Ticker ──────────────────────────────────────── */
function MetricRow({ label, value, unit, bar, barColor, critical }) {
  const anim = useAnimatedValue(value)
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-[10px] text-slate-400 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, bar)}%`, background: barColor, boxShadow: critical ? `0 0 6px ${barColor}` : 'none' }}
        />
      </div>
      <span className={`text-[10px] font-mono font-bold w-12 text-right ${critical ? 'text-red-300' : 'text-white'}`}>
        {anim}{unit}
      </span>
    </div>
  )
}

/* ── Service Integration Status ─────────────────────────────── */
function ServiceStatus({ name, status, latency }) {
  const dot = status === 'online' ? 'bg-green-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} style={{ boxShadow: status === 'online' ? '0 0 4px #4ade80' : '' }} />
        <span className="text-[10px] text-slate-300">{name}</span>
      </div>
      <span className="text-[9px] font-mono text-slate-500">{latency}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function PredictiveInsights() {
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const wasteBins = useCityStore(s => s.wasteBins)
  const energyZones = useCityStore(s => s.energyZones)
  const parkingSpots = useCityStore(s => s.parkingSpots)
  const weather = useCityStore(s => s.weather)

  const [predictions, setPredictions] = useState([])
  const [pulse, setPulse] = useState(false)
  const [tick, setTick] = useState(0)

  // ── Predictive engine ───────────────────────────────────────
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    const min = now.getMinutes()
    const newPredictions = []

    // ── TRAFFIC PREDICTION ──────────────────────────────────
    const eveningPeakHour = 18
    const minsToEvening = (eveningPeakHour - hour) * 60 - min
    const morningPeakHour = 9
    const minsToMorning = (morningPeakHour - hour) * 60 - min

    if (minsToEvening > 0 && minsToEvening < 120) {
      newPredictions.push({
        id: 'traffic-evening',
        icon: Car, color: 'red',
        label: 'Traffic Jam Predicted — 6:00 PM',
        prediction: `AI model forecasts ${Math.min(95, trafficLevel + 35)}% congestion on MP Nagar corridor in ${Math.round(minsToEvening)} min. Signal timing auto-adjusting.`,
        status: 'PREDICTED',
        timeLeft: `${Math.round(minsToEvening)}m away`,
        actionLabel: 'Pre-adjust signals',
      })
    } else if (hour === 18 || (hour === 17 && min >= 30)) {
      newPredictions.push({
        id: 'traffic-active',
        icon: Car, color: 'red',
        label: 'Evening Peak — Signals Adapting',
        prediction: `Live congestion at ${trafficLevel}%. AI has adjusted 14 signal phases. Expected clearance by 20:00.`,
        status: 'ACTIVE',
        timeLeft: 'Now',
        actionLabel: 'View corridors',
      })
    } else if (minsToMorning > 0 && minsToMorning < 90) {
      newPredictions.push({
        id: 'traffic-morning',
        icon: Car, color: 'amber',
        label: 'Morning Rush Starting',
        prediction: `Peak traffic predicted at ${morningPeakHour}:00 AM. Pre-positioning advisory issued for Habibganj & MP Nagar zones.`,
        status: 'PREDICTED',
        timeLeft: `${Math.round(minsToMorning)}m away`,
        actionLabel: 'Adjust signals',
      })
    }
    if (trafficLevel > 65) {
      newPredictions.push({
        id: 'traffic-now',
        icon: Car, color: 'red',
        label: 'High Congestion Detected',
        prediction: `City-wide traffic at ${trafficLevel}%. AI recommending alternate routes via VIP Road and Hoshangabad Road.`,
        status: 'ACTIVE',
        timeLeft: 'Live',
        actionLabel: 'Reroute',
      })
    }

    // ── WASTE PREDICTION ─────────────────────────────────────
    const highBins = wasteBins.filter(b => b.fillLevel >= 65 && b.fillLevel < 85)
    const overflowBins = wasteBins.filter(b => b.status === 'overflow')

    overflowBins.slice(0, 2).forEach((bin, idx) => {
      newPredictions.push({
        id: `waste-overflow-${idx}`,
        icon: Trash2, color: 'red',
        label: `Overflow — ${bin.name}`,
        prediction: `Fill at ${bin.fillLevel}%. Sanitation dispatch initiated. ETA: 18 min. Area health risk: elevated.`,
        status: 'ACTIVE',
        timeLeft: 'Now',
        actionLabel: 'Confirm dispatch',
      })
    })

    if (highBins.length > 0) {
      const soonestBin = highBins.sort((a, b) => b.fillLevel - a.fillLevel)[0]
      const minsToFull = Math.round(((100 - soonestBin.fillLevel) / 2.5)) // ~2.5% per 10min
      newPredictions.push({
        id: 'waste-forecast',
        icon: Trash2, color: 'amber',
        label: `${highBins.length} Bin(s) Filling Up`,
        prediction: `${soonestBin.name} at ${soonestBin.fillLevel}% — predicted full in ~${minsToFull} min. Pre-emptive collection recommended.`,
        status: 'PREDICTED',
        timeLeft: `~${minsToFull}m`,
        actionLabel: 'Send early',
      })
    }

    // ── ENERGY PREDICTION ────────────────────────────────────
    const totalLoad = energyZones.reduce((s, z) => s + z.currentLoad, 0)
    const peakLoad = energyZones.reduce((s, z) => s + Math.round(z.baseLoad * 1.3), 0)
    const loadPct = peakLoad > 0 ? Math.round((totalLoad / peakLoad) * 100) : 0

    if (loadPct > 82) {
      newPredictions.push({
        id: 'energy-peak',
        icon: Zap, color: 'amber',
        label: 'Grid Load Near Peak',
        prediction: `Current draw ${totalLoad} kW (${loadPct}% of capacity). Demand-response protocol activating for industrial zones.`,
        status: loadPct > 92 ? 'ACTIVE' : 'PREDICTED',
        timeLeft: loadPct > 92 ? 'Live' : '~15m',
        actionLabel: 'Load balance',
      })
    }

    // ── PARKING PREDICTION ───────────────────────────────────
    const nearFullLots = parkingSpots.filter(p => (p.available / p.capacity) < 0.1)
    if (nearFullLots.length >= 2) {
      newPredictions.push({
        id: 'parking-crunch',
        icon: Activity, color: 'purple',
        label: `${nearFullLots.length} Lots Near Capacity`,
        prediction: `${nearFullLots.slice(0, 2).map(p => p.name.split(' ').slice(0, 2).join(' ')).join(', ')} almost full. Redirect signage activated.`,
        status: 'ACTIVE',
        timeLeft: 'Now',
        actionLabel: 'View map',
      })
    }

    // ── WEATHER-BASED PREDICTION ─────────────────────────────
    const w = weather?.current
    if (w?.precipitation > 3) {
      newPredictions.push({
        id: 'weather-rain',
        icon: AlertTriangle, color: 'amber',
        label: 'Rain Impact on Traffic',
        prediction: `${w.precipitation}mm rainfall detected. AI projecting 20–35% traffic increase. Activating drain monitoring and pothole alerts.`,
        status: 'PREDICTED',
        timeLeft: 'Ongoing',
        actionLabel: 'Monitor drains',
      })
    }

    // If no predictions, show an all-clear
    if (newPredictions.length === 0) {
      newPredictions.push({
        id: 'all-clear',
        icon: CheckCircle2, color: 'green',
        label: 'All Systems Nominal',
        prediction: 'No critical predictions active. AI monitoring all 47 city sensors in real-time. Next scheduled analysis in 30s.',
        status: 'RESOLVED',
        timeLeft: 'Live',
      })
    }

    setPredictions(newPredictions)
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
  }, [trafficLevel, wasteBins, energyZones, parkingSpots, weather])

  // Tick every 30s to refresh time labels
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // Derived metrics
  const totalBins = wasteBins.length || 1
  const overflowCount = wasteBins.filter(b => b.status === 'overflow').length
  const highBinCount = wasteBins.filter(b => b.fillLevel > 60).length
  const totalLoad = energyZones.reduce((s, z) => s + z.currentLoad, 0)
  const peakLoad = energyZones.reduce((s, z) => s + Math.round(z.baseLoad * 1.3), 0)
  const loadPct = peakLoad > 0 ? Math.round((totalLoad / peakLoad) * 100) : 0
  const totalAvail = parkingSpots.reduce((s, p) => s + p.available, 0)
  const totalCap = parkingSpots.reduce((s, p) => s + p.capacity, 0)
  const parkingUsedPct = totalCap > 0 ? Math.round(((totalCap - totalAvail) / totalCap) * 100) : 0

  const services = [
    { name: 'Traffic IoT Feed', status: 'online', latency: '32ms' },
    { name: 'Waste Bin Sensors', status: overflowCount > 0 ? 'degraded' : 'online', latency: '45ms' },
    { name: 'Energy Grid API', status: 'online', latency: '18ms' },
    { name: 'Weather Service', status: weather ? 'online' : 'degraded', latency: '120ms' },
    { name: 'Parking Nodes', status: 'online', latency: '28ms' },
  ]

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 mb-0.5">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400" />
          <span className="text-[12px] font-bold text-white tracking-wide">Predictive Insights</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[9px] font-mono transition-colors ${pulse ? 'text-cyan-300' : 'text-slate-500'}`}>
          <Radio size={9} className={pulse ? 'text-cyan-400 animate-pulse' : ''} />
          AI LIVE
        </div>
      </div>

      {/* ── Predictions scroll ── */}
      <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-1" style={{ maxHeight: '310px' }}>
        {predictions.map((p) => (
          <PredictionCard key={p.id} {...p} />
        ))}
      </div>

      {/* ── Live Metrics ── */}
      <div className="relative bg-[#061121]/70 border border-cyan-900/40 p-3 mt-1">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/60" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/60" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/60" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/60" />
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={11} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-white">Real-Time Metrics</span>
        </div>
        <MetricRow label="Traffic" value={trafficLevel} unit="%" bar={trafficLevel} barColor={trafficLevel > 70 ? '#ef4444' : trafficLevel > 40 ? '#f59e0b' : '#22c55e'} critical={trafficLevel > 70} />
        <MetricRow label="Waste Load" value={Math.round((highBinCount / totalBins) * 100)} unit="%" bar={Math.round((highBinCount / totalBins) * 100)} barColor={overflowCount > 0 ? '#ef4444' : '#a855f7'} critical={overflowCount > 0} />
        <MetricRow label="Grid Load" value={loadPct} unit="%" bar={loadPct} barColor={loadPct > 85 ? '#f59e0b' : '#06b6d4'} critical={loadPct > 90} />
        <MetricRow label="Parking" value={parkingUsedPct} unit="%" bar={parkingUsedPct} barColor={parkingUsedPct > 90 ? '#f59e0b' : '#8b5cf6'} critical={parkingUsedPct > 90} />
      </div>

      {/* ── Service Integration Status ── */}
      <div className="relative bg-[#061121]/70 border border-cyan-900/40 p-3">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/60" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/60" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/60" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/60" />
        <div className="flex items-center gap-1.5 mb-2">
          <Radio size={11} className="text-green-400" />
          <span className="text-[10px] font-bold text-white">Service Integration</span>
          <span className="ml-auto text-[9px] text-green-400 font-mono">{services.filter(s => s.status === 'online').length}/{services.length} ONLINE</span>
        </div>
        {services.map(s => <ServiceStatus key={s.name} {...s} />)}
      </div>

    </div>
  )
}
