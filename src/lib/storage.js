// ============================================================
// Supabase Storage — Direct upload fallback for citizen reports
// Used when the local Express backend is unavailable.
// ============================================================
import { supabase } from './supabase'

const BUCKET = 'report-images'

/**
 * Upload a file to Supabase Storage (public bucket).
 * @param {File|Blob} file - The file to upload
 * @param {string} subfolder - e.g. 'reports', 'events'
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadToSupabase(file, subfolder = 'reports') {
  const ext = file.name?.split('.').pop() || 'jpg'
  const filename = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })

  if (error) throw new Error(`Supabase upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  if (!data?.publicUrl) throw new Error('Could not get public URL from Supabase Storage.')

  return data.publicUrl
}

/**
 * Upload a report image with dual-strategy:
 *  1. Try the local Express backend (supports larger files, multer processing)
 *  2. Fall back to Supabase Storage direct upload
 *
 * @param {File|Blob} file - Compressed image file
 * @param {string} [backendUrl] - Express backend URL (default from env)
 * @returns {Promise<{url: string, source: 'backend'|'supabase'}>}
 */
export async function uploadReportImage(file, backendUrl) {
  const base = backendUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

  // ── Strategy 1: Express backend ──────────────────────────
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${base}/api/upload/reports`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      return { url: data.file.url, source: 'backend' }
    }
  } catch (err) {
    // Backend not available — fall through to Supabase
    console.info('[InfraNaut] Backend upload unavailable, using Supabase Storage:', err.message)
  }

  // ── Strategy 2: Supabase Storage ─────────────────────────
  const url = await uploadToSupabase(file, 'reports')
  return { url, source: 'supabase' }
}

/**
 * Delete a file from Supabase Storage by its public URL.
 * @param {string} publicUrl
 */
export async function deleteFromSupabase(publicUrl) {
  try {
    // Extract path from URL: .../storage/v1/object/public/{bucket}/{path}
    const parts = publicUrl.split(`/${BUCKET}/`)
    if (parts.length < 2) return
    const path = parts[1]
    await supabase.storage.from(BUCKET).remove([path])
  } catch (err) {
    console.warn('[InfraNaut] Could not delete file from Supabase Storage:', err.message)
  }
}
