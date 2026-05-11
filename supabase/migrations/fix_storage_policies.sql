-- ============================================================
-- InfraNaut AI — Storage Security Fix
-- Adds the missing DELETE policy on report-images bucket
-- that caused re-upload failures when a file name collided.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- ── DROP all existing policies (clean slate) ──────────────────
DROP POLICY IF EXISTS "Authenticated users can upload report images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view report images"               ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own report images"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update report images" ON storage.objects;

-- ── POLICY 1: INSERT — authenticated users can upload ─────────
CREATE POLICY "Authenticated users can upload report images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');

-- ── POLICY 2: SELECT — public read (images embedded in reports) 
CREATE POLICY "Public can view report images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');

-- ── POLICY 3: DELETE — users can remove their own uploads ─────
-- The file path format is: reports/<timestamp>-<random>.<ext>
-- We match on bucket only (no user ownership in path), but
-- restrict to authenticated users to prevent anonymous deletion.
CREATE POLICY "Users can delete their own report images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-images');

-- ── POLICY 4: UPDATE — allow metadata updates ─────────────────
CREATE POLICY "Authenticated users can update report images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'report-images');

-- ── Ensure profiles table has email column ────────────────────
-- Required for admin email broadcasts to work correctly.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for existing profiles
-- (safe to run multiple times — only updates where email is NULL)
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

SELECT 'Storage policy migration complete! ✅' AS status;
