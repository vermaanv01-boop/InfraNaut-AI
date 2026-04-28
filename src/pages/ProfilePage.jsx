import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { supabase } from '../lib/supabase'
import { BADGE_DEFINITIONS, REPORT_CATEGORIES, BHOPAL_WARDS, getUserLevel, getLevelProgress, LEVELS } from '../utils/constants'
import { Edit2, Save, X, FileText, Zap, Award } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuthStore()
  const { badges, fetchBadges } = usePointsStore()
  const [reports, setReports] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ display_name: '', zone: '' })
  const [saving, setSaving] = useState(false)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    if (user) {
      fetchBadges(user.id)
      fetchReports()
      fetchTransactions()
      setForm({ display_name: profile?.display_name || '', zone: profile?.zone || BHOPAL_WARDS[0] })
    }
  }, [user, profile])

  const fetchReports = async () => {
    const { data } = await supabase.from('reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    setReports(data || [])
  }

  const fetchTransactions = async () => {
    const { data } = await supabase.from('point_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    setTransactions(data || [])
  }

  const saveProfile = async () => {
    setSaving(true)
    try { await updateProfile(form); setEditing(false) }
    catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const initials = (profile?.display_name || profile?.username || 'U').slice(0, 2).toUpperCase()
  const totalPoints = profile?.total_points || 0
  const level = getUserLevel(totalPoints)
  const progress = getLevelProgress(totalPoints)
  const nextLevel = LEVELS[level.index + 1]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-slate-700 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <input className="inp text-sm py-2" placeholder="Display name" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
                <select className="inp text-xs py-2" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                  {BHOPAL_WARDS.map(w => <option key={w}>{w}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving} className="btn-primary text-xs py-1.5 px-3"><Save size={12} /> Save</button>
                  <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 px-3"><X size={12} /> Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.display_name || profile?.username}</h2>
                  <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-primary-500 transition-colors"><Edit2 size={13} /></button>
                </div>
                <div className="text-sm text-slate-500">@{profile?.username}</div>
                <div className="text-xs text-slate-400 mt-0.5">📍 {profile?.zone || 'Bhopal'}</div>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-500">{totalPoints.toLocaleString()}</div>
            <div className="text-xs text-slate-400">total points</div>
          </div>
        </div>

        {/* Level + Progress */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{level.icon}</span>
              <span className={`text-sm font-bold ${level.color}`}>{level.name}</span>
            </div>
            {nextLevel && <span className="text-[10px] text-slate-400">{nextLevel.minPoints - totalPoints} pts to {nextLevel.name}</span>}
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Award size={16} className="text-amber-400" /> Badges Earned</h3>
        {badges.length === 0 ? (
          <p className="text-slate-400 text-xs">No badges yet. Start reporting issues to earn your first badge!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map(badge => {
              const def = BADGE_DEFINITIONS[badge.badge_type]
              if (!def) return null
              return (
                <div key={badge.id} className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-2xl">{def.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${def.color}`}>{def.label}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{def.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* Locked badges */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[10px] text-slate-400 mb-3 font-medium uppercase tracking-wider">Locked Badges</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BADGE_DEFINITIONS)
              .filter(([type]) => !badges.some(b => b.badge_type === type))
              .map(([type, def]) => (
                <div key={type} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/30 rounded-lg opacity-40">
                  <span className="text-sm">{def.icon}</span>
                  <span className="text-[10px] text-slate-500">{def.label}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent reports */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><FileText size={15} className="text-teal-500" /> My Reports</h3>
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400">No reports yet.</p>
          ) : (
            <div className="space-y-2">
              {reports.map(r => {
                const cat = REPORT_CATEGORIES.find(c => c.id === r.category)
                return (
                  <div key={r.id} className="flex items-center gap-2 py-2">
                    <span className="text-base">{cat?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-700 dark:text-slate-200 truncate">{r.description}</div>
                      <div className="text-[9px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${r.status === 'verified' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{r.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Points history */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Zap size={15} className="text-amber-400" /> Points History</h3>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 capitalize">{t.action.replace(/_/g, ' ')}</div>
                    <div className="text-[9px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="text-sm font-bold text-amber-500">+{t.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
