import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react'
import { useCityStore } from '../../stores/cityStore'
import { useAuthStore } from '../../stores/authStore'
import { triggerCityAlertEmail } from '../../lib/emailClient'

// ── Alert severity config ─────────────────────────────────
const SEVERITY = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    dot: 'bg-red-400',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-400',
    label: 'Info',
  },
}

// ── Individual Alert item ─────────────────────────────────
function AlertItem({ alert, onDismiss, onExpand, expanded }) {
  const s = SEVERITY[alert.severity] || SEVERITY.info
  const Icon = s.icon

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${s.bg}`}
      onClick={() => onExpand(alert.id)}
    >
      <div className="flex items-start gap-2">
        <Icon size={13} className={`${s.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[11px] font-bold ${s.color} truncate`}>{alert.title}</span>
            <button
              onClick={e => { e.stopPropagation(); onDismiss(alert.id) }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 flex-shrink-0"
            >
              <X size={10} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            {expanded ? alert.details : alert.summary}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-slate-400">{alert.location}</span>
            <span className="text-[9px] text-slate-500">·</span>
            <span className="text-[9px] text-slate-400">{alert.time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Notification Center ───────────────────────────────────
export default function NotificationCenter() {
  const getAlerts = useCityStore(s => s.getAlerts)
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const wasteBins = useCityStore(s => s.wasteBins)
  const { user, profile } = useAuthStore()

  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [dismissed, setDismissed] = useState(new Set())
  const [expanded, setExpanded] = useState(null)
  const [newCount, setNewCount] = useState(0)
  const prevAlertsRef = useRef([])
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })

  // Refresh alerts when telemetry changes
  useEffect(() => {
    const fresh = getAlerts().filter(a => !dismissed.has(a.title + a.time))
    const prevTitles = new Set(prevAlertsRef.current.map(a => a.title))
    const newAlerts = fresh.filter(a => !prevTitles.has(a.title))

    if (newAlerts.length > 0 && !open) setNewCount(prev => prev + newAlerts.length)

    // Fire email for new critical/warning alerts (fire-and-forget)
    if (newAlerts.length > 0 && user?.email) {
      newAlerts
        .filter(a => ['critical', 'warning'].includes(a.severity))
        .forEach(a => {
          triggerCityAlertEmail(
            { email: user.email, name: profile?.display_name || profile?.username, email_prefs: profile?.email_prefs },
            { title: a.title, summary: a.message || a.title, severity: a.severity, location: a.location || 'Bhopal', time: a.time, category: a.category }
          ).catch(() => {})
        })
    }

    prevAlertsRef.current = fresh
    setAlerts(fresh)
  }, [trafficLevel, wasteBins, dismissed])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Position panel to the right of button (or left-align if near right edge)
      const panelWidth = 320
      const left = rect.right + panelWidth > window.innerWidth
        ? rect.right - panelWidth
        : rect.left
      setPanelPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8)),
      })
    }
    setOpen(true)
    setNewCount(0)
  }

  const handleDismiss = useCallback((id) => {
    const alert = alerts.find(a => a.id === id)
    if (alert) setDismissed(prev => new Set([...prev, alert.title + alert.time]))
  }, [alerts])

  const handleClearAll = () => {
    const keys = alerts.map(a => a.title + a.time)
    setDismissed(prev => new Set([...prev, ...keys]))
    setAlerts([])
  }

  const handleExpand = (id) => setExpanded(prev => prev === id ? null : id)

  // Unique IDs for the alert list
  const alertsWithIds = alerts.map((a, i) => ({ ...a, id: i }))
  const criticalCount = alerts.filter(a => a.severity === 'critical').length

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`relative p-2 rounded-lg transition-colors ${
          open
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
        aria-label="Notifications"
      >
        <Bell size={18} className={criticalCount > 0 ? 'text-red-400 animate-pulse' : ''} />
        {(newCount > 0 || criticalCount > 0) && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {Math.min(9, newCount || criticalCount)}
          </span>
        )}
      </button>

      {/* Panel — fixed position to escape sidebar overflow clipping */}
      {open && (
        <>
          {/* Backdrop — closes panel on outside click */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, zIndex: 9999, width: 320 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-in-right"
          >
          {/* Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">City Alerts</span>
              {alerts.length > 0 && (
                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold">
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {alerts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/5 transition-colors"
                >
                  <Trash2 size={10} />
                  Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Alert list */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-2">
            {alertsWithIds.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">All clear!</p>
                <p className="text-[10px] text-slate-400">No active city alerts</p>
              </div>
            ) : alertsWithIds.map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                onExpand={handleExpand}
                expanded={expanded === alert.id}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-[9px] text-slate-400 text-center">
              Alerts auto-generated from live IoT telemetry · Click an alert for details
            </p>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
