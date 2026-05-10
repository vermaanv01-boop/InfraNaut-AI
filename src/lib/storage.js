// ============================================================
// InfraNaut AI — Supabase Storage Upload Service
// Dual-strategy: Express backend → Supabase Storage fallback
// ============================================================
import { supabase } from './supabase'

const BUCKET  = 'report-images'
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// ── Timeout helper ────────────────────────────────────────────
function withTimeout(promise, ms, label = 'request') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      timer && setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]).finally(() => clearTimeout(timer))
}

/**
 * Upload a file directly to Supabase Storage (public bucket).
 * Handles the case where browser-image-compression returns a Blob
 * without a proper .name property.
 *
 * @param {File|Blob} file
 * @param {string} subfolder - e.g. 'reports'
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadToSupabase(file, subfolder = 'reports') {
  // BUGFIX: browser-image-compression can return a Blob with no .name,
  // or a File whose name is 'image.jpeg' regardless of input extension.
  // Always derive the extension from the file's MIME type for reliability.
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
  }
  const ext = mimeToExt[file.type] || (file.name?.split('.').pop()) || 'jpg'

  // Unique path: reports/1715449200000-abc123.jpg
  const filename = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

  console.info(`[Storage] Uploading to Supabase bucket "${BUCKET}/${filename}" (${(file.size/1024).toFixed(1)}KB)`)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert:       false,
      contentType:  file.type || 'image/jpeg',
    })

  if (error) {
    console.error('[Storage] Supabase upload error:', error)
    // Provide specific guidance for common errors
    if (error.message?.includes('Bucket not found')) {
      throw new Error(
        'Storage bucket "report-images" not found. Run the Supabase migration at ' +
        'supabase/migrations/add_role_and_storage.sql in your Supabase SQL Editor.'
      )
    }
    if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
      throw new Error(
        'Storage permission denied. Ensure RLS policies are set up — ' +
        'run add_role_and_storage.sql migration in Supabase SQL Editor.'
      )
    }
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but could not retrieve the public URL.')
  }

  console.info('[Storage] ✅ Supabase upload complete:', data.publicUrl)
  return data.publicUrl
}

/**
 * Upload a report image with dual-strategy:
 *  1. Try the Express backend (supports larger files, multer, disk storage)
 *  2. Fall back to Supabase Storage direct upload
 *
 * @param {File|Blob} file       - Compressed image file
 * @param {function}  [onProgress] - Optional upload progress callback (0–100)
 * @returns {Promise<{ url: string, source: 'backend' | 'supabase' }>}
 */
export async function uploadReportImage(file, onProgress) {
  // ── Strategy 1: Express backend (8-second timeout) ──────────
  try {
    const formData = new FormData()
    // Ensure the Blob has a proper filename for multer
    const uploadFile = file instanceof File
      ? file
      : new File([file], `report-${Date.now()}.jpg`, { type: file.type || 'image/jpeg' })
    formData.append('file', uploadFile)

    onProgress?.(10) // Signal upload started

    const res = await withTimeout(
      fetch(`${BACKEND}/api/upload/reports`, { method: 'POST', body: formData }),
      8000,
      'Backend upload'
    )

    onProgress?.(80)

    if (res.ok) {
      const data = await res.json()
      if (data?.file?.url) {
        onProgress?.(100)
        console.info('[Storage] ✅ Uploaded via backend:', data.file.url)
        return { url: data.file.url, source: 'backend' }
      }
    } else {
      const errBody = await res.json().catch(() => ({}))
      console.warn('[Storage] Backend upload error:', res.status, errBody.error)
    }
  } catch (err) {
    // Backend unavailable (offline, CORS, timeout) → fall through to Supabase
    console.info('[Storage] Backend unavailable, falling back to Supabase Storage:', err.message)
  }

  // ── Strategy 2: Supabase Storage direct upload ───────────────
  onProgress?.(20)
  const url = await uploadToSupabase(file, 'reports')
  onProgress?.(100)
  return { url, source: 'supabase' }
}

/**
 * Delete a file from Supabase Storage by its public URL.
 * Safe to call — logs a warning but never throws.
 *
 * @param {string} publicUrl
 */
export async function deleteFromSupabase(publicUrl) {
  try {
    // Extract path after the bucket name
    // URL format: .../storage/v1/object/public/report-images/reports/file.jpg
    const parts = publicUrl.split(`/${BUCKET}/`)
    if (parts.length < 2) {
      console.warn('[Storage] Could not parse path from URL:', publicUrl)
      return
    }
    const filePath = parts[1]
    const { error } = await supabase.storage.from(BUCKET).remove([filePath])
    if (error) console.warn('[Storage] Delete failed:', error.message)
    else console.info('[Storage] File deleted:', filePath)
  } catch (err) {
    console.warn('[Storage] deleteFromSupabase error:', err.message)
  }
}
