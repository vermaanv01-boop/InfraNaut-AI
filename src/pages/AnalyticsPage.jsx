import { useState, useEffect, useCallback } from 'react'
import { useCityStore } from '../stores/cityStore'
import { nexoraCompletion } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import { REPORT_CATEGORIES } from '../utils/constants'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import { RefreshCw, Loader2, TrendingUp, AlertTriangle, Shield, Activity, Zap, Leaf } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'

const PIE_COLORS = ['#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#94a3b8']

// ── City Health Score Ring ────────────────────────────────
function HealthScoreRing({ score }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Healthy' : score >= 45 ? 'Moderate' : 'Stressed'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor"
            className="text-slate-100 dark:text-slate-800" strokeWidth="10" />
          <circle cx="64" cy="64" r={radius} fill="none" stroke={color}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-900 dark:text-white">{score}</span>
          <span className="text-[10px] text-slate-400">/100</span>
        </div>
      </div>
      <div className="mt-1 text-sm font-semibold" style={{ color }}>{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">City Health Score</div>
    </div>
  )
}

// ── Prediction Card ───────────────────────────────────────
function PredictionCard({ prediction, index }) {
  const rs = prediction.risk_score
  const riskColor = rs > 0.7 ? 'text-red-400' : rs > 0.4 ? 'text-amber-400' : 'text-green-400'
  const riskBg = rs > 0.7 ? 'bg-red-500/10 border-red-500/20' : rs > 0.4 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20'
  const riskLabel = rs > 0.7 ? 'High Risk' : rs > 0.4 ? 'Moderate' : 'Low Risk'
  const barColor = rs > 0.7 ? '#ef4444' : rs > 0.4 ? '#f59e0b' : '#22c55e'
  const cat = REPORT_CATEGORIES.find(c => c.id === prediction.category)

  return (
    <div className="card hover:shadow-md transition-all" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ backgroundColor: (cat?.color || '#94a3b8') + '22' }}>
            {cat?.emoji || '📋'}
          </div>
          <div>
            <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Nexora Insight</div>
            <div className="text-[9px] text-slate-400">{new Date(prediction.created_at).toLocaleDateString('en-IN')}</div>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full border ${riskBg} ${riskColor}`}>{riskLabel}</div>
      </div>
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
          {prediction.zone}
          <span className="text-slate-400 font-normal"> · {cat?.label || prediction.category}</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{prediction.insight}</p>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[10px] text-slate-400">{prediction.report_count} reports analysed</div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${rs * 100}%`, background: barColor }} />
          </div>
          <span className={`text-[10px] font-bold ${riskColor}`}>{Math.round(rs * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Domain Score Widget ───────────────────────────────────
function DomainScore({ label, score, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
      <Icon size={16} className={color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">{score}/100</span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${score}%`,
              background: score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Simulated 24h traffic data ────────────────────────────
const TRAFFIC_HOURS = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h.toString().padStart(2, '0')}:00`,
  Traffic: h >= 8 && h <= 10 ? 60 + Math.random() * 30 :
           h >= 17 && h <= 20 ? 55 + Math.random() * 35 :
           h >= 22 || h <= 5  ? 5 + Math.random() * 15 :
           20 + Math.random() * 25,
}))

// ── Main Analytics Page ───────────────────────────────────
export default function AnalyticsPage() {
  const getCityContext = useCityStore(s => s.getCityContext)
  const getCityHealthScore = useCityStore(s => s.getCityHealthScore)
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const aqi = useCityStore(s => s.aqi)
  const wasteBins = useCityStore(s => s.wasteBins)
  const parkingSpots = useCityStore(s => s.parkingSpots)
  const weather = useCityStore(s => s.weather)
  const initCity = useCityStore(s => s.initCity)
  const destroyCity = useCityStore(s => s.destroyCity)

  const [predictions, setPredictions] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [reportStats, setReportStats] = useState([])

  const fetchPredictions = useCallback(async () => {
    const { data } = await supabase.from('predictions').select('*').order('created_at', { ascending: false }).limit(12)
    setPredictions(data || [])
  }, [])

  const fetchReportStats = useCallback(async () => {
    const { data } = await supabase.from('reports').select('category').limit(500)
    if (data) {
      const counts = {}
      data.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1 })
      const stats = REPORT_CATEGORIES.map(c => ({ name: c.label, value: counts[c.id] || 0, color: c.color }))
      setReportStats(stats)
    }
  }, [])

  useEffect(() => {
    fetchPredictions()
    fetchReportStats()
    initCity()
    return () => destroyCity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generatePredictions = async () => {
    setGenerating(true)
    setGenError('')
    try {
      const { data: reports, error: repErr } = await supabase
        .from('reports').select('*').order('created_at', { ascending: false }).limit(100)
      if (repErr) throw new Error(`Could not fetch reports: ${repErr.message}`)
      if (!reports?.length) {
        setGenError('No citizen reports found yet. Submit reports via the City Map to generate AI insights.')
        setGenerating(false); return
      }

      const cityContext = getCityContext()
      const zones = [...new Set(reports.map(r => r.zone).filter(Boolean))].slice(0, 4)
      const newPredictions = []

      for (const zone of zones) {
        const zoneReports = reports.filter(r => r.zone === zone)
        const catCounts = REPORT_CATEGORIES.map(c => ({ cat: c.id, count: zoneReports.filter(r => r.category === c.id).length }))
        const topCat = catCounts.sort((a, b) => b.count - a.count)[0]
        if (!topCat.count) continue

        const insight = await nexoraCompletion([{
          role: 'user',
          content: `Analyze this data for ${zone} in Bhopal. Give a 2-sentence forward-looking risk prediction:\nReports: ${catCounts.map(c => `${c.cat}:${c.count}`).join(', ')}\nFocus on "${topCat.cat}" issues. Give one actionable recommendation.`
        }], 200, cityContext)

        const risk_score = Math.min(0.95, (topCat.count / 10) + (weather?.current?.precipitation > 5 ? 0.2 : 0))
        const { data: pred, error: predErr } = await supabase.from('predictions').insert({
          zone, category: topCat.cat, risk_score, insight,
          weather_data: weather?.current || {}, report_count: zoneReports.length
        }).select().single()
        if (predErr) console.warn('Prediction save error:', predErr.message)
        if (pred) newPredictions.push(pred)
      }

      if (newPredictions.length === 0) {
        setGenError('Insights generated but could not be saved. Check Supabase `predictions` table permissions.')
      }
      setPredictions(prev => [...newPredictions, ...prev])
    } catch (err) {
      console.error('generatePredictions error:', err)
      setGenError(err.message || 'Failed to generate insights. Check your OpenRouter API key.')
    } finally {
      setGenerating(false)
    }
  }

  // Derived metrics
  const healthScore = getCityHealthScore()
  const avgRisk = predictions.length ? predictions.reduce((s, p) => s + p.risk_score, 0) / predictions.length : 0
  const highRisk = predictions.filter(p => p.risk_score > 0.7).length
  const parkingChart = parkingSpots.slice(0, 8).map(p => ({
    name: p.name.split(' ').slice(0, 2).join(' '),
    available: p.available,
    capacity: p.capacity,
  }))

  // Domain scores
  const totalParking = parkingSpots.reduce((s, p) => s + p.capacity, 0)
  const availParking = parkingSpots.reduce((s, p) => s + p.available, 0)
  const domainScores = [
    { label: 'Traffic Flow', score: Math.max(0, 100 - trafficLevel), icon: Activity, color: 'text-blue-400' },
    { label: 'Air Quality', score: aqi ? Math.max(0, 100 - (aqi.value / 2)) : 65, icon: Leaf, color: 'text-green-400' },
    { label: 'Waste Mgmt', score: wasteBins.length ? Math.round((wasteBins.filter(b => b.status === 'normal').length / wasteBins.length) * 100) : 70, icon: Shield, color: 'text-amber-400' },
    { label: 'Parking', score: totalParking > 0 ? Math.round((availParking / totalParking) * 100) : 60, icon: Zap, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={22} className="text-teal-500" />
            AI Predictive Analytics
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Powered by Nexora · Bhopal City Intelligence</p>
        </div>
        <button onClick={generatePredictions} disabled={generating} className="btn-primary text-xs py-2 px-4">
          {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {generating ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>

      {genError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{genError}</span>
        </div>
      )}

      {/* City Health Dashboard */}
      <div className="grid sm:grid-cols-3 gap-5">
        {/* Health Score Ring */}
        <div className="card flex items-center justify-center py-4">
          <HealthScoreRing score={healthScore} />
        </div>

        {/* Domain Scores */}
        <div className="card sm:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity size={14} className="text-teal-500" /> Domain Health
          </h3>
          <div className="space-y-2.5">
            {domainScores.map(d => (
              <DomainScore key={d.label} {...d} />
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Insights', value: predictions.length, icon: TrendingUp, color: 'text-teal-500' },
          { label: 'High Risk Zones', value: highRisk, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Avg Risk Score', value: `${Math.round(avgRisk * 100)}%`, icon: Shield, color: avgRisk > 0.6 ? 'text-red-400' : 'text-green-400' },
          { label: 'AQI', value: aqi?.label || '—', icon: Leaf, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <Icon size={16} className={`${color} mb-2`} />
            <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Report category donut */}
        {reportStats.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Reports by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reportStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name} (${value})` : ''}>
                  {reportStats.map((entry, i) => <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 24h traffic pattern */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">24h Traffic Pattern (Simulated)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={TRAFFIC_HOURS} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#64748b"
                tickFormatter={v => v.slice(0, 2)} interval={3} />
              <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="Traffic" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Parking chart */}
      {parkingChart.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Parking Lot Usage — Live</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={parkingChart} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="capacity" fill="#e2e8f0" radius={[3, 3, 0, 0]} name="Capacity" />
              <Bar dataKey="available" fill="#22c55e" radius={[3, 3, 0, 0]} name="Available" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Predictions */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <NexoraAvatar size={24} />
          AI Predictive Insights
        </h2>
        {predictions.length === 0 ? (
          <div className="card text-center py-16">
            <NexoraAvatar size={48} className="mx-auto mb-4" />
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">No predictions yet</h3>
            <p className="text-slate-500 text-sm">Click "Generate Insights" to analyze citizen reports and weather data.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {predictions.map((pred, i) => <PredictionCard key={pred.id} prediction={pred} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
