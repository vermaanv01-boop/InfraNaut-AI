import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { nexoraCompletion } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import { WEATHER_URL, REPORT_CATEGORIES, BHOPAL_WARDS } from '../utils/constants'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import { RefreshCw, Loader2, TrendingUp, AlertTriangle, Shield } from 'lucide-react'

function PredictionCard({ prediction, index }) {
  const riskColor = prediction.risk_score > 0.7 ? 'text-red-400' : prediction.risk_score > 0.4 ? 'text-amber-400' : 'text-green-400'
  const riskBg = prediction.risk_score > 0.7 ? 'bg-red-500/10 border-red-500/20' : prediction.risk_score > 0.4 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20'
  const riskLabel = prediction.risk_score > 0.7 ? 'High Risk' : prediction.risk_score > 0.4 ? 'Moderate' : 'Low Risk'

  return (
    <div className="card hover:border-teal-800/50 transition-all animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <NexoraAvatar size={28} />
          <div>
            <div className="text-[10px] font-semibold text-teal-400">Nexora's Insight</div>
            <div className="text-[9px] text-slate-500">{new Date(prediction.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full border ${riskBg} ${riskColor}`}>
          {riskLabel}
        </div>
      </div>
      <div className="mb-3">
        <div className="text-xs font-semibold text-white mb-1">{prediction.zone} · <span className={`badge-${prediction.category} px-1.5 py-0.5 rounded-full text-[10px]`}>{prediction.category}</span></div>
        <p className="text-xs text-slate-300 leading-relaxed">{prediction.insight}</p>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <div className="text-[10px] text-slate-500">{prediction.report_count} reports analyzed</div>
        <div className="flex items-center gap-1">
          <div className="text-[10px] text-slate-500">Risk Score</div>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${prediction.risk_score > 0.7 ? 'bg-red-500' : prediction.risk_score > 0.4 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${prediction.risk_score * 100}%` }} />
          </div>
          <span className={`text-[10px] font-bold ${riskColor}`}>{Math.round(prediction.risk_score * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const [predictions, setPredictions] = useState([])
  const [generating, setGenerating] = useState(false)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetchPredictions()
    fetchWeather()
  }, [])

  const fetchPredictions = async () => {
    const { data } = await supabase.from('predictions').select('*').order('created_at', { ascending: false }).limit(12)
    setPredictions(data || [])
  }

  const fetchWeather = async () => {
    try {
      const res = await fetch(WEATHER_URL)
      const data = await res.json()
      setWeather(data)
    } catch (_) {}
  }

  const generatePredictions = async () => {
    setGenerating(true)
    try {
      const { data: reports } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100)
      if (!reports?.length) { setGenerating(false); return }

      const weatherSummary = weather?.current
        ? `Temperature: ${weather.current.temperature_2m}°C, Humidity: ${weather.current.relative_humidity_2m}%, Wind: ${weather.current.wind_speed_10m}km/h, Precipitation: ${weather.current.precipitation}mm`
        : 'Weather data unavailable'

      const zones = [...new Set(reports.map(r => r.zone).filter(Boolean))].slice(0, 4)
      const newPredictions = []

      for (const zone of zones) {
        const zoneReports = reports.filter(r => r.zone === zone)
        const catCounts = REPORT_CATEGORIES.map(c => ({ cat: c.id, count: zoneReports.filter(r => r.category === c.id).length }))
        const topCat = catCounts.sort((a, b) => b.count - a.count)[0]
        if (!topCat.count) continue

        const insight = await nexoraCompletion([{
          role: 'user',
          content: `Analyze this data for ${zone} in Bhopal and give a 2-sentence forward-looking prediction:\nReports: ${catCounts.map(c => `${c.cat}:${c.count}`).join(', ')}\nWeather: ${weatherSummary}\nFocus on the "${topCat.cat}" issue cluster. Give a risk assessment and one recommendation.`
        }], 200)

        const risk_score = Math.min(0.95, (topCat.count / 10) + (weather?.current?.precipitation > 5 ? 0.2 : 0))
        const { data: pred } = await supabase.from('predictions').insert({
          zone, category: topCat.cat, risk_score,
          insight, weather_data: weather?.current || {}, report_count: zoneReports.length
        }).select().single()
        if (pred) newPredictions.push(pred)
      }
      setPredictions(prev => [...newPredictions, ...prev])
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  const avgRisk = predictions.length ? (predictions.reduce((sum, p) => sum + p.risk_score, 0) / predictions.length) : 0
  const highRisk = predictions.filter(p => p.risk_score > 0.7).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI Predictive Analytics</h1>
          <p className="text-slate-400 text-xs mt-0.5">Powered by Nexora · Bhopal city intelligence</p>
        </div>
        <button onClick={generatePredictions} disabled={generating} className="btn-primary text-xs py-2 px-4">
          {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {generating ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Insights', value: predictions.length, icon: TrendingUp, color: 'text-teal-400' },
          { label: 'High Risk Zones', value: highRisk, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Avg Risk Score', value: `${Math.round(avgRisk * 100)}%`, icon: Shield, color: avgRisk > 0.6 ? 'text-red-400' : avgRisk > 0.4 ? 'text-amber-400' : 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <Icon size={18} className={`${color} mb-2`} />
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>
      {predictions.length === 0 ? (
        <div className="card text-center py-16">
          <NexoraAvatar size={48} className="mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No predictions yet</h3>
          <p className="text-slate-400 text-sm">Click "Generate Insights" and Nexora will analyze current reports + weather data to generate forward-looking city predictions.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {predictions.map((pred, i) => <PredictionCard key={pred.id} prediction={pred} index={i} />)}
        </div>
      )}
    </div>
  )
}
