// ============================================================
// InfraNaut AI — Frontend Email Service Client
// Calls the Express /api/email/* routes securely
// ============================================================

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const API_KEY = import.meta.env.VITE_EMAIL_API_KEY || 'infranaut-email-secret-2025'

async function post(endpoint, body) {
  try {
    const res = await fetch(`${BASE}/api/email/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn(`[EmailClient] ${endpoint} failed:`, err.error || res.status)
      return { success: false, error: err.error }
    }
    return res.json()
  } catch (err) {
    // Backend offline — graceful fallback
    console.warn(`[EmailClient] Backend unreachable for ${endpoint}:`, err.message)
    return { success: false, offline: true }
  }
}

// ── Exported email triggers ───────────────────────────────────

/**
 * Send welcome email after registration.
 * @param {object} user - { email, name }
 */
export async function triggerWelcomeEmail(user) {
  return post('welcome', { email: user.email, name: user.name || user.email.split('@')[0] })
}

/**
 * Send login notification email.
 * @param {object} user - { email, name, email_prefs }
 * @param {object} meta - { ip, device, location }
 */
export async function triggerLoginEmail(user, meta = {}) {
  if (user?.email_prefs?.login_alerts === false) return { skipped: true }
  return post('login', {
    email: user.email,
    name: user.name || user.email?.split('@')[0],
    email_prefs: user.email_prefs,
    ...meta,
  })
}

/**
 * Send weather alert email.
 * @param {object} user - { email, name, email_prefs }
 * @param {object} weatherData - from cityStore.weather.current
 * @param {object} aqiData - from cityStore.aqi
 * @param {string} aiInsight - AI-generated insight text
 */
export async function triggerWeatherAlert(user, weatherData, aqiData, aiInsight) {
  if (user?.email_prefs?.weather_alerts === false) return { skipped: true }
  return post('weather-alert', {
    email: user.email,
    name: user.name || user.email?.split('@')[0],
    email_prefs: user.email_prefs,
    weatherData,
    aqiData,
    aiInsight,
  })
}

/**
 * Send smart city alert email for critical/warning alerts.
 * @param {object} user - { email, name, email_prefs }
 * @param {object} alert - { title, summary, severity, location, category, ward }
 */
export async function triggerCityAlertEmail(user, alert) {
  if (user?.email_prefs?.city_alerts === false) return { skipped: true }
  if (!['critical', 'warning'].includes(alert?.severity)) return { skipped: true }
  return post('city-alert', {
    email: user.email,
    name: user.name || user.email?.split('@')[0],
    email_prefs: user.email_prefs,
    alert,
  })
}

/**
 * Send event reminder email.
 * @param {object} user - { email, name, email_prefs }
 * @param {object} event - Bhopal event object
 */
export async function triggerEventReminderEmail(user, event) {
  if (user?.email_prefs?.event_alerts === false) return { skipped: true }
  return post('event-reminder', {
    email: user.email,
    name: user.name || user.email?.split('@')[0],
    email_prefs: user.email_prefs,
    event,
  })
}

/**
 * Admin: send announcement to list of users.
 * @param {Array} recipients - [{ email, name }]
 * @param {string} subject
 * @param {string} message
 * @param {object} opts - { ctaUrl, ctaLabel }
 */
export async function triggerAnnouncement(recipients, subject, message, opts = {}) {
  return post('announcement', { recipients, subject, message, ...opts })
}

/**
 * Send password reset email.
 */
export async function triggerPasswordResetEmail({ email, name, resetUrl }) {
  return post('password-reset', { email, name, resetUrl })
}

/**
 * Get email queue status (admin).
 */
export async function getEmailQueueStatus() {
  try {
    const res = await fetch(`${BASE}/api/email/status`, {
      headers: { 'x-api-key': API_KEY },
    })
    if (!res.ok) return { queued: 0, processing: false }
    return res.json().then(d => d.queue || { queued: 0, processing: false })
  } catch {
    return { queued: 0, processing: false, offline: true }
  }
}
