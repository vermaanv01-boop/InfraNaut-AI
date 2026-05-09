-- ============================================================
-- InfraNaut AI — Email System Migration
-- Run this in Supabase SQL Editor AFTER add_role_and_storage.sql
-- ============================================================

-- 1. Add email_prefs JSONB column to profiles
--    Stores per-user notification preferences
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_prefs JSONB DEFAULT '{
    "welcome_email":  true,
    "login_alerts":   true,
    "weather_alerts": true,
    "city_alerts":    true,
    "event_alerts":   true,
    "sustainability": true,
    "weekly_digest":  false,
    "marketing":      false
  }'::jsonb;

-- 2. Add email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_email    TEXT NOT NULL,
  email_type  TEXT NOT NULL,  -- welcome | login | weather | city_alert | event | announcement
  subject     TEXT,
  status      TEXT DEFAULT 'queued', -- queued | sent | failed
  resend_id   TEXT,           -- Resend email ID for tracking
  error_msg   TEXT,
  metadata    JSONB,          -- extra context (alert severity, event id, etc.)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast per-user lookup
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type    ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- 3. Row Level Security for email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own logs
DROP POLICY IF EXISTS "Users read own email logs" ON email_logs;
CREATE POLICY "Users read own email logs"
  ON email_logs FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all logs
DROP POLICY IF EXISTS "Admins read all email logs" ON email_logs;
CREATE POLICY "Admins read all email logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'city_operator')
    )
  );

-- Service role can insert logs (used by backend)
DROP POLICY IF EXISTS "Service insert email logs" ON email_logs;
CREATE POLICY "Service insert email logs"
  ON email_logs FOR INSERT
  WITH CHECK (true);

-- 4. Backfill existing users with default prefs
UPDATE profiles
SET email_prefs = '{
  "welcome_email":  true,
  "login_alerts":   true,
  "weather_alerts": true,
  "city_alerts":    true,
  "event_alerts":   true,
  "sustainability": true,
  "weekly_digest":  false,
  "marketing":      false
}'::jsonb
WHERE email_prefs IS NULL;
