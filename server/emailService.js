// ============================================================
// InfraNaut AI — Email Service (Resend)
// Handles all transactional emails with queue + rate limiting
// ============================================================
require('dotenv').config()
const { Resend } = require('resend')
const templates = require('./emailTemplates')

// ── Startup validation ───────────────────────────────────
const RESEND_KEY = process.env.RESEND_API_KEY
if (!RESEND_KEY || RESEND_KEY.includes('YOUR_RESEND')) {
  console.warn('[EmailService] ⚠️  RESEND_API_KEY is missing or a placeholder. Emails will NOT send.')
} else {
  console.log('[EmailService] ✅ RESEND_API_KEY loaded. FROM:', process.env.EMAIL_FROM || 'default')
}

const resend = new Resend(RESEND_KEY)
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
// Supports Resend SDK v2 response format: { data: { id }, error }
async function sendEmail({ to, subject, html, retries = 0 }) {
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html })
    // Resend v2 SDK returns { data, error } — check both
    if (result?.error) throw new Error(result.error.message || 'Resend API error')
    const emailId = result?.data?.id || result?.id
    console.log(`[EmailService] ✅ Sent "${subject}" to ${to} | id: ${emailId}`)
    return { success: true, id: emailId }
  } catch (err) {
    if (retries < MAX_RETRIES) {
      const delay = 2000 * (retries + 1)
      console.warn(`[EmailService] ↻ Retry ${retries + 1}/${MAX_RETRIES} for ${to} in ${delay}ms: ${err.message}`)
      await new Promise(r => setTimeout(r, delay))
      return sendEmail({ to, subject, html, retries: retries + 1 })
    }
    console.error(`[EmailService] ❌ Failed after ${MAX_RETRIES} retries for ${to}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

// ── Queue processor ──────────────────────────────────────────
async function processQueue() {
  if (isProcessing || emailQueue.length === 0) return
  isProcessing = true
  while (emailQueue.length > 0) {
    const { _resolve, ...job } = emailQueue.shift()
    const result = await sendEmail(job)
    if (_resolve) _resolve(result)
    if (emailQueue.length > 0) await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
  }
  isProcessing = false
}

function enqueue(job) {
  return new Promise((resolve) => {
    emailQueue.push({ ...job, _resolve: resolve })
    processQueue()
  })
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
  // Enqueue all, then await all to return proper results/errors
  const jobs = []
  for (const user of toList) {
    const { html } = templates.announcementEmail({ name: user.name || 'User', subject, message, ...opts })
    jobs.push(enqueue({ to: user.email, subject, html }))
    // Stagger sends to stay within rate limits (200ms gap)
    await new Promise(r => setTimeout(r, 200))
  }
  return Promise.all(jobs)
}

exports.sendPasswordReset = async ({ email, name, resetUrl }) => {
  const { subject, html } = templates.passwordResetEmail({ name, resetUrl })
  return sendEmail({ to: email, subject, html }) // direct, bypass queue
}

exports.getQueueStatus = () => ({
  queued: emailQueue.length,
  processing: isProcessing,
})
