// ============================================================
// InfraNaut AI — Client-side Image Compression
// Uses browser-image-compression for lightweight pre-upload
// compression. Reduces bandwidth and Supabase storage usage.
// ============================================================
import imageCompression from 'browser-image-compression'

// Practical limits: compress to 2MB max, 1200px max dimension
const MAX_INPUT_MB  = 30   // Reject files larger than this before compressing
const MAX_OUTPUT_MB = 2    // Target output size (reasonable for report images)
const MAX_DIMENSION = 1200 // px — good balance of quality and file size

/**
 * Compress an image client-side before uploading.
 * Returns a File/Blob safe for Supabase Storage or the Express backend.
 *
 * @param {File} file - Raw file from <input type="file">
 * @param {function} [onProgress] - Optional progress callback (0–100)
 * @returns {Promise<File>}
 */
export async function compressImage(file, onProgress) {
  // ── Input validation ────────────────────────────────────────
  if (!file || !(file instanceof Blob)) {
    throw new Error('Invalid file provided for compression.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error(`Unsupported file type: ${file.type}. Please use jpg, png, or webp.`)
  }

  const inputMB = file.size / (1024 * 1024)
  if (inputMB > MAX_INPUT_MB) {
    throw new Error(
      `File is too large (${inputMB.toFixed(1)}MB). Maximum allowed is ${MAX_INPUT_MB}MB.`
    )
  }

  // Skip compression for very small files (already optimized)
  if (file.size < 200 * 1024) {
    console.info('[ImageCompression] File already small (<200KB) — skipping compression.')
    return file
  }

  const options = {
    maxSizeMB:        MAX_OUTPUT_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker:     true,
    fileType:         'image/jpeg',
    initialQuality:   0.82,
    onProgress:       onProgress || undefined,
  }

  try {
    const compressed = await imageCompression(file, options)
    const outputMB = compressed.size / (1024 * 1024)
    console.info(
      `[ImageCompression] ${inputMB.toFixed(2)}MB → ${outputMB.toFixed(2)}MB` +
      ` (${Math.round((1 - compressed.size / file.size) * 100)}% reduction)`
    )
    return compressed
  } catch (err) {
    console.error('[ImageCompression] Compression failed:', err)
    throw new Error(`Image compression failed: ${err.message || 'Unknown error'}`)
  }
}

/**
 * Convert a File/Blob to a base64 data URL for image preview.
 * @param {File|Blob} file
 * @returns {Promise<string>} Data URL
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file for preview.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Validate that a file is an acceptable image before processing.
 * Call this before compressImage for faster early rejection.
 *
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Unsupported format: ${file.type}. Use jpg, png, or webp.` }
  }

  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > MAX_INPUT_MB) {
    return { valid: false, error: `File too large (${sizeMB.toFixed(1)}MB). Max ${MAX_INPUT_MB}MB.` }
  }

  return { valid: true }
}
