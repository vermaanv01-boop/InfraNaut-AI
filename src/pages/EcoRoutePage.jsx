import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCityStore } from '../stores/cityStore'
import { nexoraCompletion } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import NexoraMessage from '../components/nexora/NexoraMessage'
import { Leaf, MapPin, Loader2, Save, CheckCircle2, History, Trash2, X } from 'lucide-react'

export default function EcoRoutePage() {
  const { user } = useAuthStore()
  const { awardPoints } = usePointsStore()
  const getCityContext = useCityStore(s => s.getCityContext)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedRoutes, setSavedRoutes] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const loadSavedRoutes = useCallback(async () => {
    setLoadingSaved(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('eco_routes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (fetchErr) throw fetchErr
      setSavedRoutes(data || [])
    } catch (err) {
      console.error('Failed to load saved routes:', err)
    } finally {
      setLoadingSaved(false)
    }
  }, [user])

  // Load saved routes on mount
  useEffect(() => {
    if (user) loadSavedRoutes()
  }, [user, loadSavedRoutes])

  const getSuggestion = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError('Please enter both origin and destination')
      return
    }
    setError('')
    setLoading(true)
    setSuggestion('')
    setSaved(false)
    try {
      const cityContext = getCityContext()
      const result = await nexoraCompletion([{
        role: 'user',
        content: `I'm in Bhopal and want to travel from "${origin}" to "${destination}". Please suggest the most eco-friendly route options. Compare: walking, cycling, auto-rickshaw, and bus. For each option give: estimated time, approximate CO₂ emissions, and a brief reason. Use the live traffic data to adjust recommendations. Format with clear sections. End with your top recommendation.`
      }], 600, cityContext)
      setSuggestion(result)
    } catch (err) {
      console.error('Eco route error:', err)
      setError('Failed to get suggestion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveRoute = async () => {
    if (!suggestion || saved || !user) return
    try {
      const { data, error: insertErr } = await supabase.from('eco_routes').insert({
        user_id: user.id,
        origin,
        destination,
        suggestion: { text: suggestion, generated_at: new Date().toISOString() }
      }).select().single()

      if (insertErr) throw insertErr

      await awardPoints(user.id, 'ECO_ROUTE_SAVED')
      setSaved(true)
      if (data) setSavedRoutes(prev => [data, ...prev])
    } catch (err) {
      console.error('Save route error:', err)
      setError('Failed to save route. Please try again.')
    }
  }

  const deleteRoute = async (routeId) => {
    try {
      const { error: delErr } = await supabase
        .from('eco_routes')
        .delete()
        .eq('id', routeId)
        .eq('user_id', user.id)
      if (delErr) throw delErr
      setSavedRoutes(prev => prev.filter(r => r.id !== routeId))
    } catch (err) {
      console.error('Delete route error:', err)
    }
  }

  const loadSavedRoute = (route) => {
    setOrigin(route.origin)
    setDestination(route.destination)
    setSuggestion(route.suggestion?.text || '')
    setSaved(true)
    setShowHistory(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/15">
            <Leaf size={20} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Eco-Route Advisor</h1>
            <p className="text-slate-400 text-xs mt-0.5">Powered by Nexora · Find the greenest way to travel in Bhopal</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="btn-secondary text-xs py-2 px-3 relative"
        >
          <History size={13} />
          <span className="hidden sm:inline">Saved</span>
          {savedRoutes.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center">
              {savedRoutes.length}
            </span>
          )}
        </button>
      </div>

      {/* Saved Routes Panel */}
      {showHistory && (
        <div className="card animate-fade-in" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History size={14} className="text-green-400" /> Saved Routes
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={14} />
            </button>
          </div>
          {loadingSaved ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-slate-400" />
            </div>
          ) : savedRoutes.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No saved routes yet. Generate and save your first eco route!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedRoutes.map(route => (
                <div key={route.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                  <button onClick={() => loadSavedRoute(route)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                      <MapPin size={10} className="text-green-400 flex-shrink-0" />
                      <span className="truncate">{route.origin}</span>
                      <span className="text-slate-400">→</span>
                      <span className="truncate">{route.destination}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {new Date(route.created_at).toLocaleDateString()} · {new Date(route.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteRoute(route.id)}
                    className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Route Input */}
      <div className="card" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <NexoraAvatar size={28} />
          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">Ask Nexora for an Eco Route</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1.5">📍 From</label>
            <input className="inp" placeholder="e.g. New Market, Bhopal" value={origin} onChange={e => setOrigin(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1.5">🏁 To</label>
            <input className="inp" placeholder="e.g. Arera Colony, Bhopal" value={destination} onChange={e => setDestination(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={getSuggestion} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Leaf size={15} />}
            {loading ? 'Nexora is analyzing routes...' : 'Get Eco Route Suggestions'}
          </button>
        </div>
      </div>

      {/* Results */}
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

      {/* Info Card */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">🌿 Why Eco Routes?</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Choosing walking, cycling, or public transit over private vehicles reduces Bhopal's carbon footprint and traffic congestion. Every eco-friendly journey earns you points and contributes to a cleaner city.</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { mode: '🚶 Walk', co2: '0g', label: 'Zero emissions' },
            { mode: '🚌 Bus', co2: '~30g/km', label: 'Low emissions' },
            { mode: '🛺 Auto', co2: '~90g/km', label: 'Moderate' },
          ].map(item => (
            <div key={item.mode} className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-lg mb-1">{item.mode.split(' ')[0]}</div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.mode.split(' ')[1]}</div>
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">{item.co2} CO₂</div>
              <div className="text-[9px] text-slate-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
