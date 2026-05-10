// ============================================================
// InfraNaut AI — Email API Routes (Express Router)
// Mount in server/index.js: app.use('/api/email', emailRoutes)
// ============================================================
const express = require('express')
const router = express.Router()
const emailService = require('./emailService')

// ── Auth guard — must match EMAIL_API_KEY in server/.env ─────
// IMPORTANT: Default MUST match the value in server/.env
const API_KEY = process.env.EMAIL_API_KEY || 'infranaut-email-secret-2025'

function requireKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.body?.apiKey
  if (!key || key !== API_KEY) {
    console.warn(`[EmailRoutes] ❌ Unauthorized request to ${req.path} — key mismatch`)
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' })
  }
  next()
}

// ── POST /api/email/welcome ──────────────────────────────────
router.post('/welcome', requireKey, async (req, res) => {
  const { email, name } = req.body
  if (!email || !name) return res.status(400).json({ error: 'email and name required' })
  try {
    await emailService.sendWelcomeEmail({ email, name })
    res.json({ success: true, message: 'Welcome email queued' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/email/login ────────────────────────────────────
router.post('/login', requireKey, async (req, res) => {
  const { email, name, ip, device, location, email_prefs } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  try {
    await emailService.sendLoginEmail({ email, name, email_prefs }, { ip, device, location, timestamp: new Date().toLocaleString('en-IN') })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/email/weather-alert ───────────────────────────
router.post('/weather-alert', requireKey, async (req, res) => {
  const { email, name, weatherData, aqiData, aiInsight, email_prefs } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  try {
    await emailService.sendWeatherAlert({ email, name, email_prefs }, weatherData, aqiData, aiInsight)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/email/city-alert ───────────────────────────────
router.post('/city-alert', requireKey, async (req, res) => {
  const { email, name, alert, email_prefs } = req.body
  if (!email || !alert) return res.status(400).json({ error: 'email and alert required' })
  try {
    await emailService.sendCityAlert({ email, name, email_prefs }, alert)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/email/event-reminder ──────────────────────────
router.post('/event-reminder', requireKey, async (req, res) => {
  const { email, name, event, email_prefs } = req.body
  if (!email || !event) return res.status(400).json({ error: 'email and event required' })
  try {
    await emailService.sendEventReminder({ email, name, email_prefs }, event)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/email/announcement (admin only) ────────────────
router.post('/announcement', requireKey, async (req, res) => {
  const { recipients, subject, message, ctaUrl, ctaLabel } = req.body
  if (!recipients?.length || !subject || !message) {
    return res.status(400).json({ error: 'recipients, subject, and message required' })
  }
  try {
    await emailService.sendAnnouncement(recipients, subject, message, { ctaUrl, ctaLabel })
    res.json({ success: true, queued: recipients.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/email/password-reset ──────────────────────────
router.post('/password-reset', requireKey, async (req, res) => {
  const { email, name, resetUrl } = req.body
  if (!email || !resetUrl) return res.status(400).json({ error: 'email and resetUrl required' })
  try {
    await emailService.sendPasswordReset({ email, name, resetUrl })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/email/test?email=your@email.com ─────────────────
// No auth required — use this to verify your Resend key works
router.get('/test', async (req, res) => {
  const to = req.query.email
  if (!to) return res.status(400).json({ error: 'Provide ?email=your@email.com in the URL' })

  const key = process.env.RESEND_API_KEY
  if (!key || key.includes('YOUR_RESEND')) {
    return res.status(500).json({
      error: 'RESEND_API_KEY is not set',
      fix: 'Edit server/.env and replace re_YOUR_RESEND_API_KEY_HERE with your real key from resend.com'
    })
  }

  try {
    const result = await emailService.sendWelcomeEmail({ email: to, name: 'Test User' })
    res.json({
      success: true,
      message: `Test email queued for ${to}`,
      note: 'With onboarding@resend.dev sender, email only delivers to the Resend account owner email.',
      result,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/email/status ────────────────────────────────────
router.get('/status', requireKey, (req, res) => {
  res.json({ success: true, queue: emailService.getQueueStatus() })
})

module.exports = router
