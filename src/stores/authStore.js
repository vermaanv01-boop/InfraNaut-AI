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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      }
    } catch (err) {
      console.warn('[Auth] Initialization error:', err)
    } finally {
      set({ loading: false, initialized: true })
    }

    // Store unsubscribe to prevent leaks
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: session.user })
          await get().fetchProfile(session.user.id).catch(() => {})
        } else {
          set({ user: null, profile: null })
        }
      })
      set({ _authSub: subscription })
    } catch (err) {
      console.warn('[Auth] Auth listener setup failed:', err)
    }
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

    if (data?.user) {
      set({ user: data.user })

      supabase
        .from('profiles')
        .select('display_name, username, email_prefs')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => {
          triggerLoginEmail(
            {
              email,
              name: profile?.display_name || profile?.username || email.split('@')[0],
              email_prefs: profile?.email_prefs,
            },
            { device: navigator?.userAgent?.slice(-60) || 'Web Browser' }
          ).then(r => {
            if (r?.success) console.info('[Auth] Login email queued.')
            else if (r?.skipped) console.info('[Auth] Login email skipped (user preference).')
          }).catch(() => {})
        })
        .catch(() => {})
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

    // If auto-login succeeded, update zone and fire welcome email
    if (data.session && data.user) {
      set({ user: data.user })
      try {
        await supabase.from('profiles').update({ zone }).eq('id', data.user.id)
      } catch (profileErr) {
        console.warn('[Auth] Profile zone update failed:', profileErr.message)
      }
      triggerWelcomeEmail({ email, name: username })
        .then(r => {
          if (r?.success) console.info('[Auth] Welcome email queued.')
        })
        .catch(() => {})
    }

    // Email confirmation required — let the caller know
    if (data.user && !data.session) {
      return { user: data.user, session: null, confirmationRequired: true }
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

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    })
    if (error) throw error
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
