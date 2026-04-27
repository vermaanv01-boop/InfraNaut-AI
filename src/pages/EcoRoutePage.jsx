import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { nexoraCompletion } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import NexoraMessage from '../components/nexora/NexoraMessage'
import { Leaf, MapPin, Loader2, Save, CheckCircle2 } from 'lucide-react'

export default function EcoRoutePage() {
  const { user } = useAuthStore()
  const { awardPoints } = usePointsStore()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedRoutes, setSavedRoutes] = useState([])
  const [error, setError] = useState('')

  const getSuggestion = async () => {
    if (!origin.trim() || !destination.trim()) { setError('Please enter both origin and destination'); return }
    setError(''); setLoading(true); setSuggestion(''); setSaved(false)
    try {
      const result = await nexoraCompletion([{
        role: 'user',
        content: `I'm in Bhopal and want to travel from "${origin}" to "${destination}". Please suggest the most eco-friendly route options. Compare: walking, cycling, auto-rickshaw, and bus. For each option give: estimated time, approximate CO₂ emissions, and a brief reason. Format with clear sections. End with your top recommendation.`
      }], 600)
      setSuggestion(result)
    } catch (err) { setError('Failed to get suggestion. Please try again.') }
    finally { setLoading(false) }
  }

  const saveRoute = async () => {
    if (!suggestion || saved) return
    try {
      await supabase.from('eco_routes').insert({
        user_id: user.id, origin, destination,
        suggestion: { text: suggestion, generated_at: new Date().toISOString() }
      })
      await awardPoints(user.id, 'ECO_ROUTE_SAVED')
      setSaved(true)
      setSavedRoutes(prev => [{ origin, destination, suggestion }, ...prev])
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-green-500/15">
          <Leaf size={20} className="text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Eco-Route Advisor</h1>
          <p className="text-slate-400 text-xs mt-0.5">Powered by Nexora · Find the greenest way to travel in Bhopal</p>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <NexoraAvatar size={28} />
          <span className="text-sm font-semibold text-teal-400">Ask Nexora for an Eco Route</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">📍 From</label>
            <input className="inp" placeholder="e.g. New Market, Bhopal" value={origin} onChange={e => setOrigin(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">🏁 To</label>
            <input className="inp" placeholder="e.g. Arera Colony, Bhopal" value={destination} onChange={e => setDestination(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={getSuggestion} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Leaf size={15} />}
            {loading ? 'Nexora is analyzing routes...' : 'Get Eco Route Suggestions'}
          </button>
        </div>
      </div>

      {(loading || suggestion) && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-400">Nexora's Route Suggestions</div>
          {loading ? (
            <div className="card">
              <div className="flex gap-2.5">
                <NexoraAvatar size={34} glow />
                <div className="flex-1 space-y-2 py-2">
                  <div className="h-3 rounded shimmer w-full" />
                  <div className="h-3 rounded shimmer w-4/5" />
                  <div className="h-3 rounded shimmer w-3/5" />
                </div>
              </div>
            </div>
          ) : suggestion ? (
            <div className="card" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
              <NexoraMessage content={suggestion} timestamp={new Date().toISOString()} />
              {!saved ? (
                <button onClick={saveRoute} className="mt-4 btn-ghost text-xs py-2 w-full justify-center hover:border-green-500/50 hover:text-green-400">
                  <Save size={13} /> Save this route (+15 pts)
                </button>
              ) : (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg py-2">
                  <CheckCircle2 size={13} /> Route saved! +15 points earned
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-1">🌿 Why Eco Routes?</h3>
        <p className="text-xs text-slate-400 leading-relaxed">Choosing walking, cycling, or public transit over private vehicles reduces Bhopal's carbon footprint and traffic congestion. Every eco-friendly journey earns you points and contributes to a cleaner city.</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { mode: '🚶 Walk', co2: '0g', label: 'Zero emissions' },
            { mode: '🚌 Bus', co2: '~30g/km', label: 'Low emissions' },
            { mode: '🛺 Auto', co2: '~90g/km', label: 'Moderate' },
          ].map(item => (
            <div key={item.mode} className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-lg mb-1">{item.mode.split(' ')[0]}</div>
              <div className="text-xs font-semibold text-white">{item.mode.split(' ')[1]}</div>
              <div className="text-[10px] text-teal-400 font-medium">{item.co2} CO₂</div>
              <div className="text-[9px] text-slate-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
