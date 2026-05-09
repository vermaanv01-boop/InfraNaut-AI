// ============================================================
// InfraNaut AI — Email Service (Resend)
// Handles all transactional emails with queue + rate limiting
// ============================================================
require('dotenv').config()
const { Resend } = require('resend')
const templates = require('./emailTemplates')

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'InfraNaut AI <onboarding@resend.dev>'

// ── In-memory email queue (simple, production: use Bull/Redis) ──
const emailQueue = []
let isProcessing = false
const RATE_LIMIT_MS = 1000   // 1 email/sec max
const MAX_RETRIES = 3

// ── Deduplication: prevent duplicate emails within 60s ──────
const recentlySent = new Map()
function isDuplicate(key) {
  const last = recentlySent.get(key)
  if (last && Date.now() - last < 60_000) return true
  recentlySent.set(key, Date.now())
  // Clean old entries every 100 sends
  if (recentlySent.size > 100) {
    const cutoff = Date.now() - 120_000
    for (const [k, t] of recentlySent) if (t < cutoff) recentlySent.delete(k)
  }
  return false
}

// ── Core send function ───────────────────────────────────────
async function sendEmail({ to, subject, html, retries = 0 }) {
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html })
    console.log(`[Email] ✅ Sent to ${to}: ${subject}`)
    return { success: true, id: result.id }
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.warn(`[Email] Retry ${retries + 1} for ${to}`)
      await new Promise(r => setTimeout(r, 2000 * (retries + 1)))
      return sendEmail({ to, subject, html, retries: retries + 1 })
    }
    console.error(`[Email] ❌ Failed after ${MAX_RETRIES} retries: ${to}`, err.message)
    return { success: false, error: err.message }
  }
}

// ── Queue processor ──────────────────────────────────────────
async function processQueue() {
  if (isProcessing || emailQueue.length === 0) return
  isProcessing = true
  while (emailQueue.length > 0) {
    const job = emailQueue.shift()
    await sendEmail(job)
    if (emailQueue.length > 0) await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
  }
  isProcessing = false
}

function enqueue(job) {
  emailQueue.push(job)
  processQueue()
}

// ── Public API ───────────────────────────────────────────────

exports.sendWelcomeEmail = async (user) => {
  const key = `welcome:${user.email}`
  if (isDuplicate(key)) return { skipped: true }
  const { subject, html } = templates.welcomeEmail(user)
  return enqueue({ to: user.email, subject, html })
}

exports.sendLoginEmail = async (user, meta = {}) => {
  // Only send if user opted in (default: true)
  if (user.email_prefs?.login_alerts === false) return { skipped: true }
  const key = `login:${user.email}:${Math.floor(Date.now() / 60000)}`  // once/min
  if (isDuplicate(key)) return { skipped: true }
  const { subject, html } = templates.loginEmail({ name: user.name || user.email.split('@')[0], ...meta })
  return enqueue({ to: user.email, subject, html })
}

exports.sendWeatherAlert = async (user, weatherData, aqiData, aiInsight) => {
  if (user.email_prefs?.weather_alerts === false) return { skipped: true }
  const key = `weather:${user.email}:${new Date().toDateString()}`
  if (isDuplicate(key)) return { skipped: true }
  const { subject, html } = templates.weatherEmail({
    name: user.name || user.email.split('@')[0],
    weatherData, aqiData, aiInsight,
  })
  return enqueue({ to: user.email, subject, html })
}

exports.sendCityAlert = async (user, alert) => {
  if (user.email_prefs?.city_alerts === false) return { skipped: true }
  // Only send critical/warning alerts via email
  if (!['critical', 'warning'].includes(alert.severity)) return { skipped: true }
  const key = `city-alert:${user.email}:${alert.title}:${new Date().toDateString()}`
  if (isDuplicate(key)) return { skipped: true }
  const { subject, html } = templates.cityAlertEmail({ name: user.name || user.email.split('@')[0], alert })
  return enqueue({ to: user.email, subject, html })
}

exports.sendEventReminder = async (user, event) => {
  if (user.email_prefs?.event_alerts === false) return { skipped: true }
  const key = `event:${user.email}:${event.id}`
  if (isDuplicate(key)) return { skipped: true }
  const { subject, html } = templates.eventReminderEmail({ name: user.name || user.email.split('@')[0], event })
  return enqueue({ to: user.email, subject, html })
}

exports.sendAnnouncement = async (toList, subject, message, opts = {}) => {
  const results = []
  for (const user of toList) {
    const { html } = templates.announcementEmail({ name: user.name || 'User', subject, message, ...opts })
    results.push(enqueue({ to: user.email, subject, html }))
    await new Promise(r => setTimeout(r, 200)) // spread sends
  }
  return results
}

exports.sendPasswordReset = async ({ email, name, resetUrl }) => {
  const { subject, html } = templates.passwordResetEmail({ name, resetUrl })
  return sendEmail({ to: email, subject, html }) // direct, bypass queue
}

exports.getQueueStatus = () => ({
  queued: emailQueue.length,
  processing: isProcessing,
})
