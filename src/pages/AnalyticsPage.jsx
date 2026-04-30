import { useState, useEffect, useCallback } from 'react'
import { useCityStore } from '../stores/cityStore'
import { nexoraCompletion } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import { REPORT_CATEGORIES } from '../utils/constants'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import { RefreshCw, Loader2, TrendingUp, AlertTriangle, Shield } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const PIE_COLORS = ['#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#94a3b8']

function PredictionCard({ prediction, index }) {
  const rs = prediction.risk_score
  const riskColor = rs > 0.7 ? 'text-red-400' : rs > 0.4 ? 'text-amber-400' : 'text-green-400'
  const riskBg = rs > 0.7 ? 'bg-red-500/10 border-red-500/20' : rs > 0.4 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20'
  const riskLabel = rs > 0.7 ? 'High Risk' : rs > 0.4 ? 'Moderate' : 'Low Risk'
  const barColor = rs > 0.7 ? '#ef4444' : rs > 0.4 ? '#f59e0b' : '#22c55e'

  return (
    <div className="card hover:shadow-md transition-all" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <NexoraAvatar size={28} />
          <div>
            <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Nexora Insight</div>
            <div className="text-[9px] text-slate-400">{new Date(prediction.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full border ${riskBg} ${riskColor}`}>{riskLabel}</div>
      </div>
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">{prediction.zone} · <span className="text-slate-500">{prediction.category}</span></div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{prediction.insight}</p>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[10px] text-slate-400">{prediction.report_count} reports</div>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${rs * 100}%`, background: barColor }} />
          </div>
          <span className={`text-[10px] font-bold ${riskColor}`}>{Math.round(rs * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const getCityContext = useCityStore(s => s.getCityContext)
  const weather = useCityStore(s => s.weather)
  const parkingSpots = useCityStore(s => s.parkingSpots)
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
      const { data: reports, error: repErr } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100)
      if (repErr) throw new Error(`Could not fetch reports: ${repErr.message}`)
      if (!reports?.length) {
        setGenError('No citizen reports found yet. Submit reports via the City Map to generate AI insights.')
        setGenerating(false)
        return
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
          content: `Analyze this data for ${zone} in Bhopal. Give a 2-sentence forward-looking prediction:\nReports: ${catCounts.map(c => `${c.cat}:${c.count}`).join(', ')}\nFocus on "${topCat.cat}" issues. Give risk assessment and one recommendation.`
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

  const avgRisk = predictions.length ? (predictions.reduce((s, p) => s + p.risk_score, 0) / predictions.length) : 0
  const highRisk = predictions.filter(p => p.risk_score > 0.7).length

  // Parking chart data
  const parkingChart = parkingSpots.slice(0, 8).map(p => ({ name: p.name.split(' ').slice(0, 2).join(' '), available: p.available, capacity: p.capacity }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Predictive Analytics</h1>
          <p className="text-slate-500 text-xs mt-0.5">Powered by Nexora · Bhopal city intelligence</p>
        </div>
        <button onClick={generatePredictions} disabled={generating} className="btn-primary text-xs py-2 px-4">
          {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {generating ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>

      {/* Error banner */}
      {genError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{genError}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Insights', value: predictions.length, icon: TrendingUp, color: 'text-teal-500' },
          { label: 'High Risk Zones', value: highRisk, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Avg Risk Score', value: `${Math.round(avgRisk * 100)}%`, icon: Shield, color: avgRisk > 0.6 ? 'text-red-400' : 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <Icon size={18} className={`${color} mb-2`} />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5">
        {reportStats.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Reports by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reportStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {reportStats.map((entry, i) => <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {parkingChart.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Parking Usage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={parkingChart}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Predictions */}
      {predictions.length === 0 ? (
        <div className="card text-center py-16">
          <NexoraAvatar size={48} className="mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-semibold mb-2">No predictions yet</h3>
          <p className="text-slate-500 text-sm">Click "Generate Insights" to analyze reports + weather data.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {predictions.map((pred, i) => <PredictionCard key={pred.id} prediction={pred} index={i} />)}
        </div>
      )}
    </div>
  )
}
