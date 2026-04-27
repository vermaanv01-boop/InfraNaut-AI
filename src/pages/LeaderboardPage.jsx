import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { BADGE_DEFINITIONS } from '../utils/constants'
import { Trophy, Crown, Medal } from 'lucide-react'

function LeaderRow({ user: u, rank, isCurrentUser }) {
  const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank
  const badges = u.badges || []
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrentUser ? 'bg-teal-500/10 border border-teal-500/20' : 'hover:bg-slate-800/50'}`}>
      <div className={`w-8 text-center text-sm font-bold ${rank <= 3 ? 'text-xl' : 'text-slate-400'}`}>{rankIcon}</div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {(u.display_name || u.username || 'U').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white flex items-center gap-1.5">
          {u.display_name || u.username}
          {isCurrentUser && <span className="text-[9px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full">You</span>}
        </div>
        <div className="text-[10px] text-slate-500">{u.zone || 'Bhopal'}</div>
      </div>
      <div className="flex gap-1">
        {badges.slice(0, 3).map(b => (
          <span key={b.badge_type} title={BADGE_DEFINITIONS[b.badge_type]?.label}>{BADGE_DEFINITIONS[b.badge_type]?.icon}</span>
        ))}
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-amber-400">{u.total_points?.toLocaleString() || 0}</div>
        <div className="text-[9px] text-slate-500">points</div>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('global')
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [zone, setZone] = useState('')

  useEffect(() => { fetchLeaderboard() }, [tab, zone])

  const fetchLeaderboard = async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*, badges(*)')
      .order('total_points', { ascending: false })
      .limit(50)
    if (tab === 'zone' && zone) query = query.eq('zone', zone)
    const { data } = await query
    setLeaders(data || [])
    setLoading(false)
  }

  const currentUserRank = leaders.findIndex(l => l.id === user?.id) + 1

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Trophy size={22} className="text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Leaderboard</h1>
          <p className="text-slate-400 text-xs mt-0.5">Top civic contributors in Bhopal</p>
        </div>
        {currentUserRank > 0 && (
          <div className="ml-auto text-right">
            <div className="text-xs text-slate-400">Your rank</div>
            <div className="text-2xl font-bold text-amber-400">#{currentUserRank}</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {['global', 'zone'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-teal-600/80 text-white' : 'text-slate-400 bg-slate-800/60 hover:text-slate-200'}`}>
            {t === 'global' ? '🌍 Global' : '📍 By Zone'}
          </button>
        ))}
      </div>
      {tab === 'zone' && (
        <select className="inp text-xs py-2 max-w-xs" value={zone} onChange={e => setZone(e.target.value)}>
          <option value="">All zones</option>
          {['Ward 1 - Shyamla Hills', 'Ward 2 - Arera Colony', 'Ward 3 - New Market', 'Ward 4 - Habibganj'].map(w => <option key={w}>{w}</option>)}
        </select>
      )}
      <div className="card space-y-1">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-8 h-5 rounded shimmer" />
              <div className="w-9 h-9 rounded-full shimmer" />
              <div className="flex-1 space-y-1">
                <div className="h-3 rounded shimmer w-32" />
                <div className="h-2 rounded shimmer w-20" />
              </div>
              <div className="h-5 rounded shimmer w-16" />
            </div>
          ))
        ) : leaders.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No data yet — start reporting issues to earn points!</p>
        ) : leaders.map((u, i) => (
          <LeaderRow key={u.id} user={u} rank={i + 1} isCurrentUser={u.id === user?.id} />
        ))}
      </div>
    </div>
  )
}
