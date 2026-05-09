// ============================================================
// InfraNaut AI — Email Preferences Store
// Persists email notification settings to Supabase profiles
// ============================================================
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const DEFAULT_PREFS = {
  welcome_email:    true,
  login_alerts:     true,
  weather_alerts:   true,
  city_alerts:      true,
  event_alerts:     true,
  sustainability:   true,
  weekly_digest:    false,
  marketing:        false,
}

export const useEmailPrefsStore = create((set, get) => ({
  prefs: { ...DEFAULT_PREFS },
  loading: false,
  saving: false,
  lastSaved: null,

  // Load from Supabase profiles.email_prefs column
  loadPrefs: async (userId) => {
    if (!userId) return
    set({ loading: true })
    const { data } = await supabase
      .from('profiles')
      .select('email_prefs')
      .eq('id', userId)
      .single()
    if (data?.email_prefs) {
      set({ prefs: { ...DEFAULT_PREFS, ...data.email_prefs } })
    }
    set({ loading: false })
  },

  // Toggle a single pref
  toggle: (key) => {
    set(s => ({ prefs: { ...s.prefs, [key]: !s.prefs[key] } }))
  },

  // Save all prefs to Supabase
  savePrefs: async (userId) => {
    if (!userId) return
    set({ saving: true })
    const prefs = get().prefs
    const { error } = await supabase
      .from('profiles')
      .update({ email_prefs: prefs })
      .eq('id', userId)
    if (!error) set({ lastSaved: new Date().toISOString() })
    set({ saving: false })
    return !error
  },

  // Reset to defaults
  resetToDefaults: () => set({ prefs: { ...DEFAULT_PREFS } }),
}))
