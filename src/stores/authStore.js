import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { triggerWelcomeEmail, triggerLoginEmail } from '../lib/emailClient'

// ── Role constants ────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:     'super_admin',
  CITY_OPERATOR:   'city_operator',
  TRAFFIC_MANAGER: 'traffic_manager',
  WASTE_OFFICER:   'waste_officer',
  CITIZEN:         'citizen',
}

// ── Role helpers (standalone — use outside component or in selectors) ──
export function isAdminRole(role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.CITY_OPERATOR
}
export function isOperatorRole(role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.CITY_OPERATOR ||
         role === ROLES.TRAFFIC_MANAGER || role === ROLES.WASTE_OFFICER
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  // ── Selector helpers (call as store actions, not state getters) ──
  getRole: () => get().profile?.role || ROLES.CITIZEN,
  isAdmin: () => isAdminRole(get().profile?.role),
  isOperator: () => isOperatorRole(get().profile?.role),

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
    }
    set({ loading: false, initialized: true })

    // Store unsubscribe to prevent leaks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
    })
    set({ _authSub: subscription })
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) set({ profile: data })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Fire login alert email (fire-and-forget, never blocks)
    if (data?.user) {
      const profile = get().profile
      triggerLoginEmail(
        { email, name: profile?.display_name || profile?.username, email_prefs: profile?.email_prefs },
        { device: navigator?.userAgent?.split(' ').slice(-2).join(' ') || 'Web Browser' }
      ).catch(() => {})
    }
    return data
  },

  signUp: async (email, password, username, zone) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    })
    if (error) throw error

    // If auto-login succeeded, update zone
    if (data.session && data.user) {
      await supabase.from('profiles').update({ zone }).eq('id', data.user.id)
      // Send welcome email (fire-and-forget)
      triggerWelcomeEmail({ email, name: username }).catch(() => {})
    }
    return data
  },

  signOut: async () => {
    // Unsubscribe auth listener
    get()._authSub?.unsubscribe()
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Supabase signout issue:', e)
    } finally {
      set({ user: null, profile: null, _authSub: null })
    }
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    set({ profile: data })
  },
}))
