-- ============================================================
-- InfraNaut AI — Add email column to profiles + admin RPC
-- Run this in Supabase SQL Editor AFTER add_email_system.sql
-- ============================================================

-- 1. Add email column to profiles (mirrors auth.users.email)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill email from auth.users for all existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- 3. Keep email in sync via trigger on new signups
--    (the existing handle_new_user trigger is updated below)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, email, total_points)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    0
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN new;
END;
$$;

-- 4. Admin-only RPC: returns id, email, display_name for all users
--    Only callable by super_admin or city_operator roles
CREATE OR REPLACE FUNCTION public.get_all_user_emails()
RETURNS TABLE(id UUID, email TEXT, display_name TEXT, username TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND role IN ('super_admin', 'city_operator')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
    SELECT p.id, p.email, p.display_name, p.username
    FROM public.profiles p
    WHERE p.email IS NOT NULL
    ORDER BY p.created_at ASC
    LIMIT 500;
END;
$$;

-- Grant execute to authenticated users (the function itself enforces admin check)
GRANT EXECUTE ON FUNCTION public.get_all_user_emails() TO authenticated;
