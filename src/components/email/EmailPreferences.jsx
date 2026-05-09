import { useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useEmailPrefsStore, DEFAULT_PREFS } from '../../stores/emailPrefsStore'
import { Mail, Bell, Cloud, Calendar, Shield, Zap, Leaf, RefreshCw, Save, CheckCircle } from 'lucide-react'

const PREF_ITEMS = [
  { key: 'login_alerts',   icon: Shield,   label: 'Login Alerts',          desc: 'Email when a new login is detected on your account',    color: 'text-blue-400' },
  { key: 'weather_alerts', icon: Cloud,    label: 'Weather Alerts',        desc: 'Daily weather and AQI summary for Bhopal',             color: 'text-sky-400' },
  { key: 'city_alerts',    icon: Zap,      label: 'Smart City Alerts',     desc: 'Critical traffic, infrastructure and emergency alerts', color: 'text-amber-400' },
  { key: 'event_alerts',   icon: Calendar, label: 'Event Reminders',       desc: 'Upcoming Bhopal events with venue and transport info',  color: 'text-purple-400' },
  { key: 'sustainability', icon: Leaf,     label: 'Sustainability Tips',   desc: 'Eco-friendly suggestions and green city insights',      color: 'text-green-400' },
  { key: 'weekly_digest',  icon: Bell,     label: 'Weekly City Digest',    desc: 'Sunday summary of city stats and key events',          color: 'text-teal-400' },
  { key: 'marketing',      icon: Mail,     label: 'Platform Updates',      desc: 'New features, improvements and announcements',         color: 'text-slate-400' },
]

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${enabled ? 'bg-teal-500' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function EmailPreferences() {
  const { user, profile } = useAuthStore()
  const { prefs, loading, saving, lastSaved, loadPrefs, toggle, savePrefs, resetToDefaults } = useEmailPrefsStore()

  useEffect(() => {
    if (user?.id) loadPrefs(user.id)
  }, [user?.id])

  const handleSave = async () => {
    await savePrefs(user?.id)
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center">
            <Mail size={16} className="text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Email Notifications</h3>
            <p className="text-xs text-slate-500">{enabledCount} of {PREF_ITEMS.length} enabled · {profile?.email || user?.email}</p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={11} /> Reset
        </button>
      </div>

      {/* Always-on notice */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
        <Shield size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>Welcome emails</strong> are always sent on registration and cannot be disabled.
          Security-critical emails may be sent regardless of preference settings.
        </p>
      </div>

      {/* Preference toggles */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {PREF_ITEMS.map(({ key, icon: Icon, label, desc, color }) => (
            <div
              key={key}
              className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0`}>
                <Icon size={14} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</div>
                <div className="text-[11px] text-slate-500 truncate">{desc}</div>
              </div>
              <Toggle enabled={!!prefs[key]} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-between pt-2">
        {lastSaved && (
          <span className="text-[11px] text-green-500 flex items-center gap-1">
            <CheckCircle size={11} /> Saved {new Date(lastSaved).toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto btn-primary py-2 px-4 text-sm disabled:opacity-50"
        >
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> Save Preferences</>}
        </button>
      </div>
    </div>
  )
}
