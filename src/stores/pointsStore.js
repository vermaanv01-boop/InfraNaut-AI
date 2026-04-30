import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { POINTS } from '../utils/constants'

export const usePointsStore = create((set, get) => ({
  transactions: [],
  badges: [],
  flash: null, // { points, x, y }

  awardPoints: async (userId, action, referenceId = null) => {
    const points = POINTS[action] ?? 0
    if (!points || !userId) return

    const { error } = await supabase.from('point_transactions').insert({
      user_id: userId,
      action: action.toLowerCase(),
      points,
      reference_id: referenceId,
    })
    if (error) { console.error('Points error:', error); return }

    // Update local profile total
    await supabase.rpc('increment_user_points', { uid: userId, pts: points })

    // Check badges
    await get().checkBadges(userId)

    // Flash animation
    set({ flash: { points, id: Date.now() } })
    setTimeout(() => set({ flash: null }), 2000)
  },

  checkBadges: async (userId) => {
    const { data: existingBadges } = await supabase
      .from('badges')
      .select('badge_type')
      .eq('user_id', userId)

    const has = (type) => existingBadges?.some(b => b.badge_type === type)

    const { data: reports } = await supabase
      .from('reports')
      .select('id, status')
      .eq('user_id', userId)

    const { data: routes } = await supabase
      .from('eco_routes')
      .select('id')
      .eq('user_id', userId)

    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', userId)

    const toAward = []

    if (!has('first_responder') && reports?.length >= 1)
      toAward.push('first_responder')
    if (!has('eco_hero') && routes?.length >= 5)
      toAward.push('eco_hero')
    if (!has('chatterbox') && msgs?.length >= 20)
      toAward.push('chatterbox')
    if (!has('verified_reporter') && reports?.filter(r => r.status === 'verified').length >= 5)
      toAward.push('verified_reporter')

    // top_10 checked separately after leaderboard fetch
    for (const badge_type of toAward) {
      await supabase.from('badges').insert({ user_id: userId, badge_type })
    }
  },

  fetchBadges: async (userId) => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
    set({ badges: data || [] })
  },
}))
