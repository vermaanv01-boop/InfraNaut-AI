-- ============================================================
-- InfraNaut AI — Supabase Migration (FIXED)
-- Run each section separately if needed in Supabase SQL Editor
-- ============================================================

-- ── STEP 1: Add role column to profiles ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'
  CHECK (role IN ('super_admin', 'city_operator', 'traffic_manager', 'waste_officer', 'citizen'));

-- ── STEP 2: Create report-images storage bucket ──────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- ── STEP 3: Storage RLS Policies ─────────────────────────────
-- Drop first to avoid conflicts, then recreate

DROP POLICY IF EXISTS "Authenticated users can upload report images" ON storage.objects;
CREATE POLICY "Authenticated users can upload report images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'report-images');

DROP POLICY IF EXISTS "Public can view report images" ON storage.objects;
CREATE POLICY "Public can view report images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'report-images');

-- ── STEP 4: Predictions table ────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone         TEXT NOT NULL,
  category     TEXT NOT NULL,
  risk_score   FLOAT NOT NULL DEFAULT 0.5,
  insight      TEXT NOT NULL,
  weather_data JSONB DEFAULT '{}'::jsonb,
  report_count INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Drop old policies first
DROP POLICY IF EXISTS "All authenticated users can read predictions" ON predictions;
DROP POLICY IF EXISTS "All authenticated users can insert predictions" ON predictions;

CREATE POLICY "All authenticated users can read predictions"
ON predictions FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can insert predictions"
ON predictions FOR INSERT TO authenticated WITH CHECK (true);

-- ── STEP 5: Elevate yourself to super_admin ───────────────────
-- Uncomment and replace 'your_username' before running:
-- UPDATE profiles SET role = 'super_admin' WHERE username = 'your_username';

SELECT 'Migration complete! ✅' AS status;
