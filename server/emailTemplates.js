// ============================================================
// InfraNaut AI — Email Templates (Resend-compatible HTML)
// ============================================================

const BRAND = {
  primary: '#06b6d4',
  dark: '#0a0f1a',
  card: '#0d1b2a',
  text: '#e2e8f0',
  muted: '#94a3b8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
}

const base = (title, preheader, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#060d18;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0}
    .wrap{max-width:600px;margin:0 auto;padding:24px 16px}
    .header{background:linear-gradient(135deg,#0a1628,#0d2040);border:1px solid rgba(6,182,212,0.25);border-radius:16px 16px 0 0;padding:32px 32px 24px;text-align:center}
    .logo-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px}
    .logo-dot{width:10px;height:10px;background:#06b6d4;border-radius:50%;box-shadow:0 0 8px #06b6d4}
    .logo-text{font-size:20px;font-weight:800;letter-spacing:2px;color:#fff}
    .logo-sub{font-size:11px;color:#06b6d4;letter-spacing:3px;text-transform:uppercase}
    .card{background:#0d1b2a;border:1px solid rgba(6,182,212,0.15);border-top:none;border-radius:0 0 16px 16px;padding:32px}
    .badge{display:inline-block;background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3);color:#06b6d4;font-size:11px;font-weight:700;letter-spacing:2px;padding:4px 14px;border-radius:100px;text-transform:uppercase;margin-bottom:20px}
    h1{font-size:24px;font-weight:800;color:#fff;margin-bottom:10px;line-height:1.3}
    p{font-size:15px;color:#94a3b8;line-height:1.7;margin-bottom:16px}
    .cta{display:block;width:fit-content;margin:24px auto 0;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.5px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
    .info-box{background:#060d18;border:1px solid rgba(6,182,212,0.12);border-radius:10px;padding:14px}
    .info-label{font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}
    .info-value{font-size:14px;color:#e2e8f0;font-weight:600}
    .alert-box{border-radius:10px;padding:16px;margin:16px 0;border-left:3px solid}
    .alert-warn{background:rgba(245,158,11,0.08);border-color:#f59e0b}
    .alert-danger{background:rgba(239,68,68,0.08);border-color:#ef4444}
    .alert-success{background:rgba(34,197,94,0.08);border-color:#22c55e}
    .alert-info{background:rgba(6,182,212,0.08);border-color:#06b6d4}
    .feature-row{display:flex;gap:12px;margin-bottom:10px;align-items:flex-start}
    .feature-icon{width:32px;height:32px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;line-height:32px;text-align:center}
    .divider{border:none;border-top:1px solid rgba(6,182,212,0.1);margin:24px 0}
    .footer{text-align:center;padding:20px 0 8px;font-size:11px;color:#334155}
    .footer a{color:#06b6d4;text-decoration:none}
    .stat-row{display:flex;justify-content:space-around;text-align:center;margin:20px 0}
    .stat-num{font-size:22px;font-weight:800;color:#06b6d4}
    .stat-lbl{font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1px}
    .tag{display:inline-block;background:rgba(6,182,212,0.1);color:#67e8f9;font-size:11px;padding:3px 8px;border-radius:5px;margin:2px}
    @media(max-width:480px){.info-grid{grid-template-columns:1fr}.cta{width:100%;text-align:center}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo-row">
      <div class="logo-dot"></div>
      <span class="logo-text">InfraNaut AI</span>
      <div class="logo-dot"></div>
    </div>
    <div class="logo-sub">Smart Sustainable City · Bhopal</div>
  </div>
  <div class="card">
    ${body}
    <hr class="divider"/>
    <div class="footer">
      <p>© 2025 InfraNaut AI · Bhopal Smart City Platform<br/>
      <a href="#">Manage Preferences</a> · <a href="#">Unsubscribe</a> · <a href="#">Privacy Policy</a></p>
    </div>
  </div>
</div>
</body>
</html>`

// ── 1. Welcome Email ─────────────────────────────────────────
exports.welcomeEmail = ({ name, email }) => ({
  subject: `Welcome to InfraNaut AI, ${name}! 🏙️`,
  html: base('Welcome to InfraNaut AI', `Hello ${name}, your smart city journey begins now.`, `
    <div class="badge">Registration Confirmed</div>
    <h1>Welcome aboard, ${name}! 🎉</h1>
    <p>You've successfully joined <strong>InfraNaut AI</strong> — Bhopal's most advanced Smart City Intelligence Platform. Your account is active and ready to explore.</p>
    <div class="alert-box alert-success">
      <strong style="color:#22c55e">✅ Account Active</strong><br/>
      <span style="font-size:13px;color:#94a3b8">${email} · Registered ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
    </div>
    <h2 style="font-size:17px;color:#fff;margin-bottom:14px">What you can do on InfraNaut AI:</h2>
    <div class="feature-row"><div class="feature-icon">🗺️</div><div><strong style="color:#e2e8f0">City Intelligence Map</strong><p style="margin:0;font-size:13px">Real-time GIS map with traffic, parking, waste, and AQI overlays</p></div></div>
    <div class="feature-row"><div class="feature-icon">🤖</div><div><strong style="color:#e2e8f0">Nexora AI Assistant</strong><p style="margin:0;font-size:13px">Multi-agent AI with live Bhopal telemetry and contextual insights</p></div></div>
    <div class="feature-row"><div class="feature-icon">🏙️</div><div><strong style="color:#e2e8f0">3D Digital Twin</strong><p style="margin:0;font-size:13px">Interactive 3D model of Bhopal's key landmarks and infrastructure</p></div></div>
    <div class="feature-row"><div class="feature-icon">📊</div><div><strong style="color:#e2e8f0">Predictive Analytics</strong><p style="margin:0;font-size:13px">AI-powered forecasts for traffic, AQI, and city health scores</p></div></div>
    <div class="feature-row"><div class="feature-icon">🌿</div><div><strong style="color:#e2e8f0">Eco Route Planner</strong><p style="margin:0;font-size:13px">Sustainable route suggestions with carbon footprint estimates</p></div></div>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/app" class="cta">Open Your Dashboard →</a>
  `)
})

// ── 2. Login Alert Email ─────────────────────────────────────
exports.loginEmail = ({ name, ip, device, location, timestamp }) => ({
  subject: `New login to your InfraNaut AI account`,
  html: base('Login Notification', 'A new login was detected on your account.', `
    <div class="badge">Security Alert</div>
    <h1>New Login Detected 🔐</h1>
    <p>Hi <strong>${name}</strong>, we detected a successful login to your InfraNaut AI account. If this was you, no action is needed.</p>
    <div class="info-grid">
      <div class="info-box"><div class="info-label">Date & Time</div><div class="info-value">${timestamp || new Date().toLocaleString('en-IN')}</div></div>
      <div class="info-box"><div class="info-label">IP Address</div><div class="info-value">${ip || 'Unknown'}</div></div>
      <div class="info-box"><div class="info-label">Device</div><div class="info-value">${device || 'Web Browser'}</div></div>
      <div class="info-box"><div class="info-label">Location</div><div class="info-value">${location || 'Bhopal, India'}</div></div>
    </div>
    <div class="alert-box alert-warn">
      <strong style="color:#f59e0b">⚠️ Not you?</strong><br/>
      <span style="font-size:13px;color:#94a3b8">If you did not initiate this login, please change your password immediately and contact support.</span>
    </div>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/app/profile" class="cta">Review Account Security →</a>
  `)
})

// ── 3. Weather Alert Email ───────────────────────────────────
exports.weatherEmail = ({ name, weatherData, aqiData, aiInsight }) => {
  const w = weatherData || {}
  const aqi = aqiData || {}
  const aqiColor = aqi.value > 150 ? '#ef4444' : aqi.value > 100 ? '#f59e0b' : '#22c55e'
  return {
    subject: `🌤️ Bhopal Weather Alert — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}`,
    html: base('Weather Alert', 'Today\'s smart weather summary for Bhopal', `
      <div class="badge">Weather Intelligence</div>
      <h1>Today's Bhopal Forecast 🌤️</h1>
      <p>Hi <strong>${name}</strong>, here's your personalized weather and air quality summary powered by Nexora AI.</p>
      <div class="stat-row">
        <div><div class="stat-num">${w.temperature_2m ?? '--'}°C</div><div class="stat-lbl">Temperature</div></div>
        <div><div class="stat-num">${w.relative_humidity_2m ?? '--'}%</div><div class="stat-lbl">Humidity</div></div>
        <div><div class="stat-num" style="color:${aqiColor}">${aqi.value ?? '--'}</div><div class="stat-lbl">AQI · ${aqi.label ?? 'N/A'}</div></div>
        <div><div class="stat-num">${w.wind_speed_10m ?? '--'}</div><div class="stat-lbl">Wind km/h</div></div>
      </div>
      ${aiInsight ? `<div class="alert-box alert-info"><strong style="color:#06b6d4">🤖 Nexora Insight</strong><br/><span style="font-size:13px;color:#94a3b8">${aiInsight}</span></div>` : ''}
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/app" class="cta">View Live Dashboard →</a>
    `)
  }
}

// ── 4. Smart City Alert Email ────────────────────────────────
exports.cityAlertEmail = ({ name, alert }) => {
  const sev = alert.severity || 'info'
  const sevColor = sev === 'critical' ? '#ef4444' : sev === 'warning' ? '#f59e0b' : '#06b6d4'
  const sevClass = sev === 'critical' ? 'alert-danger' : sev === 'warning' ? 'alert-warn' : 'alert-info'
  return {
    subject: `🚨 Smart City Alert: ${alert.title}`,
    html: base('City Alert', alert.summary, `
      <div class="badge" style="border-color:${sevColor};color:${sevColor}">City Alert · ${sev.toUpperCase()}</div>
      <h1>${alert.title}</h1>
      <div class="alert-box ${sevClass}">
        <strong style="color:${sevColor}">${sev === 'critical' ? '🔴' : sev === 'warning' ? '🟡' : 'ℹ️'} ${sev.toUpperCase()}</strong><br/>
        <span style="font-size:14px;color:#e2e8f0">${alert.summary}</span>
      </div>
      <div class="info-grid">
        <div class="info-box"><div class="info-label">Category</div><div class="info-value">${alert.category || 'Infrastructure'}</div></div>
        <div class="info-box"><div class="info-label">Location</div><div class="info-value">${alert.location || 'Bhopal'}</div></div>
        <div class="info-box"><div class="info-label">Time</div><div class="info-value">${alert.time || new Date().toLocaleTimeString('en-IN')}</div></div>
        <div class="info-box"><div class="info-label">Ward</div><div class="info-value">${alert.ward || 'City-wide'}</div></div>
      </div>
      ${alert.details ? `<p>${alert.details}</p>` : ''}
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/app/map" class="cta">View on City Map →</a>
    `)
  }
}

// ── 5. Event Reminder Email ──────────────────────────────────
exports.eventReminderEmail = ({ name, event }) => ({
  subject: `📅 Reminder: ${event.name} is coming up!`,
  html: base('Event Reminder', `Don't miss ${event.name} in Bhopal!`, `
    <div class="badge">Event Reminder</div>
    <h1>📅 Don't miss ${event.name}!</h1>
    <p>Hi <strong>${name}</strong>, this is a friendly reminder about an upcoming event in Bhopal.</p>
    <div class="info-grid">
      <div class="info-box"><div class="info-label">Date</div><div class="info-value">${event.date || 'TBD'}</div></div>
      <div class="info-box"><div class="info-label">Time</div><div class="info-value">${event.timeSlot || 'TBD'}</div></div>
      <div class="info-box"><div class="info-label">Venue</div><div class="info-value">${event.venue || 'Bhopal'}</div></div>
      <div class="info-box"><div class="info-label">Category</div><div class="info-value">${event.category || 'Cultural'}</div></div>
    </div>
    ${event.transportAdvice ? `<div class="alert-box alert-info"><strong style="color:#06b6d4">🚌 Transport Tip</strong><br/><span style="font-size:13px;color:#94a3b8">${event.transportAdvice}</span></div>` : ''}
    ${event.parkingNearby?.length ? `<p><strong style="color:#e2e8f0">Nearby Parking:</strong> ${event.parkingNearby.map(p => `<span class="tag">${p}</span>`).join('')}</p>` : ''}
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/app/events" class="cta">View Event Details →</a>
  `)
})

// ── 6. Admin Announcement Email ──────────────────────────────
exports.announcementEmail = ({ name, subject: subj, message, ctaUrl, ctaLabel }) => ({
  subject: subj || 'InfraNaut AI — Platform Announcement',
  html: base(subj, message?.slice(0, 100), `
    <div class="badge">Platform Announcement</div>
    <h1>${subj || 'Important Update'}</h1>
    <p>Hi <strong>${name}</strong>,</p>
    <p>${message}</p>
    ${ctaUrl ? `<a href="${ctaUrl}" class="cta">${ctaLabel || 'Learn More →'}</a>` : ''}
  `)
})

// ── 7. Password Reset Email ──────────────────────────────────
exports.passwordResetEmail = ({ name, resetUrl }) => ({
  subject: 'Reset your InfraNaut AI password',
  html: base('Password Reset', 'Use the link below to reset your password.', `
    <div class="badge">Password Reset</div>
    <h1>Reset Your Password 🔑</h1>
    <p>Hi <strong>${name}</strong>, we received a request to reset your InfraNaut AI account password. Click below to create a new password.</p>
    <div class="alert-box alert-warn"><strong style="color:#f59e0b">⚠️ Link expires in 1 hour.</strong><br/><span style="font-size:13px;color:#94a3b8">If you did not request this, please ignore this email — your account is safe.</span></div>
    <a href="${resetUrl}" class="cta">Reset My Password →</a>
  `)
})
