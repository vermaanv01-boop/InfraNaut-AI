import { useState, useEffect } from 'react'
import { Mail, Send, Users, RefreshCw, CheckCircle, XCircle, Zap, AlertTriangle, Activity } from 'lucide-react'
import { triggerAnnouncement, triggerWeatherAlert, triggerCityAlertEmail, getEmailQueueStatus } from '../../lib/emailClient'
import { useCityStore } from '../../stores/cityStore'
import { supabase } from '../../lib/supabase'

const EMAIL_TYPES = [
  { id: 'announcement', label: 'Announcement', icon: '📢', desc: 'Broadcast a message to all or selected users' },
  { id: 'weather',      label: 'Weather Alert', icon: '🌤️', desc: 'Send current weather summary to opted-in users' },
  { id: 'city-alert',  label: 'City Alert',    icon: '🚨', desc: 'Send a custom smart-city alert email' },
]

export default function AdminEmailPanel() {
  const weather = useCityStore(s => s.weather)
  const aqi = useCityStore(s => s.aqi)

  const [activeType, setActiveType] = useState('announcement')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [severity, setSeverity] = useState('warning')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertLocation, setAlertLocation] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [queueStatus, setQueueStatus] = useState({ queued: 0, processing: false })
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    // Load user count and queue status
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .then(({ count }) => setUserCount(count || 0))
    refreshQueue()
    const interval = setInterval(refreshQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  const refreshQueue = async () => {
    const q = await getEmailQueueStatus()
    setQueueStatus(q)
  }

  const handleSend = async () => {
    setSending(true)
    setResult(null)
    try {
      let res
      if (activeType === 'announcement') {
        if (!subject.trim() || !message.trim()) {
          setResult({ ok: false, msg: 'Subject and message are required.' })
          setSending(false)
          return
        }
        // Use admin RPC to safely get user emails (security definer, admin-only)
        let profiles = null
        let profilesError = null

        // Try the admin RPC first (requires add_email_to_profiles.sql migration)
        const rpcResult = await supabase.rpc('get_all_user_emails')
        if (!rpcResult.error && rpcResult.data?.length) {
          profiles = rpcResult.data
        } else {
          // Fallback: read email column directly (requires migration)
          const { data, error } = await supabase
            .from('profiles')
            .select('id, email, username, display_name')
            .not('email', 'is', null)
            .limit(500)
          profiles = data
          profilesError = error
        }

        if (profilesError || !profiles?.length) {
          setResult({ ok: false, msg: '⚠️ No recipients found. Run the add_email_to_profiles.sql migration in Supabase, then retry.' })
          setSending(false)
          return
        }

        const recipients = profiles
          .filter(p => p.email)
          .map(p => ({
            email: p.email,
            name: p.display_name || p.username || p.email.split('@')[0],
          }))

        if (!recipients.length) {
          setResult({ ok: false, msg: 'No recipients with email addresses found.' })
          setSending(false)
          return
        }
        res = await triggerAnnouncement(recipients, subject, message, { ctaUrl, ctaLabel })
        setResult({ ok: true, msg: `Announcement queued for ${recipients.length} users.` })

      } else if (activeType === 'weather') {
        // Demo: send to self (admin) as a preview
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) { setResult({ ok: false, msg: 'Not authenticated.' }); setSending(false); return }
        res = await triggerWeatherAlert(
          { email: user.email, name: 'Admin Preview' },
          weather?.current, aqi, 'This is an admin-triggered weather digest preview.'
        )
        setResult({ ok: true, msg: 'Weather alert sent to your admin email as preview.' })

      } else if (activeType === 'city-alert') {
        if (!alertTitle.trim() || !message.trim()) {
          setResult({ ok: false, msg: 'Title and details are required.' })
          setSending(false)
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) { setResult({ ok: false, msg: 'Not authenticated.' }); setSending(false); return }
        res = await triggerCityAlertEmail(
          { email: user.email, name: 'Admin Preview', email_prefs: { city_alerts: true } },
          { title: alertTitle, summary: message, severity, location: alertLocation, time: new Date().toLocaleTimeString() }
        )
        setResult({ ok: true, msg: `City alert (${severity}) sent to your admin email as preview.` })
      }
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Send failed.' })
    }
    setSending(false)
    refreshQueue()
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{userCount}</div>
          <div className="text-[11px] text-slate-500">Total Users</div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-center">
          <div className="text-xl font-bold text-teal-500">{queueStatus.queued}</div>
          <div className="text-[11px] text-slate-500">Queued Emails</div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${queueStatus.processing ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
            <div className="text-sm font-bold text-slate-900 dark:text-white">{queueStatus.processing ? 'Active' : 'Idle'}</div>
          </div>
          <div className="text-[11px] text-slate-500">Email Queue</div>
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {EMAIL_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveType(t.id); setResult(null) }}
            className={`flex-1 p-2.5 rounded-xl border text-center transition-all ${
              activeType === t.id
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="text-base mb-0.5">{t.icon}</div>
            <div className="text-[11px] font-semibold">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Compose area */}
      <div className="space-y-3">
        {activeType === 'announcement' && (
          <>
            <input
              className="inp text-sm"
              placeholder="Subject *"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <textarea
              className="inp text-sm resize-none"
              rows={4}
              placeholder="Message body *"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input className="inp text-sm" placeholder="CTA URL (optional)" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} />
              <input className="inp text-sm" placeholder="CTA Label (optional)" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} />
            </div>
          </>
        )}
        {activeType === 'weather' && (
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
            <p className="text-[12px] text-sky-600 dark:text-sky-400 flex items-center gap-2">
              <Activity size={13} />
              Will send <strong>current live weather & AQI data</strong> from Bhopal to your admin email as a preview.
              Live data: {weather?.current?.temperature_2m ?? '--'}°C · AQI {aqi?.value ?? '--'} ({aqi?.label ?? 'N/A'})
            </p>
          </div>
        )}
        {activeType === 'city-alert' && (
          <>
            <input className="inp text-sm" placeholder="Alert title *" value={alertTitle} onChange={e => setAlertTitle(e.target.value)} />
            <div className="flex gap-2">
              <select className="inp text-sm flex-1" value={severity} onChange={e => setSeverity(e.target.value)}>
                <option value="critical">🔴 Critical</option>
                <option value="warning">🟡 Warning</option>
                <option value="info">🔵 Info</option>
              </select>
              <input className="inp text-sm flex-1" placeholder="Location (optional)" value={alertLocation} onChange={e => setAlertLocation(e.target.value)} />
            </div>
            <textarea className="inp text-sm resize-none" rows={3} placeholder="Alert details *" value={message} onChange={e => setMessage(e.target.value)} />
          </>
        )}

        {/* Result feedback */}
        {result && (
          <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
            result.ok
              ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
          }`}>
            {result.ok ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <XCircle size={14} className="mt-0.5 flex-shrink-0" />}
            {result.msg}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-primary w-full justify-center disabled:opacity-50"
        >
          {sending ? <><RefreshCw size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Email</>}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          Powered by Resend · Rate-limited queue · Respects user preferences
        </p>
      </div>
    </div>
  )
}
