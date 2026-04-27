import imageCompression from 'browser-image-compression'

const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

/**
 * Compress image client-side: max 800px, 70% JPEG quality, 3MB hard cap.
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function compressImage(file) {
  if (file.size > MAX_SIZE_BYTES * 3) {
    throw new Error(`File too large. Maximum allowed size is ${MAX_SIZE_MB}MB after compression.`)
  }

  const options = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.7,
  }

  const compressed = await imageCompression(file, options)

  if (compressed.size > MAX_SIZE_BYTES) {
    throw new Error(`Compressed image still exceeds ${MAX_SIZE_MB}MB. Please use a smaller image.`)
  }

  return compressed
}

/**
 * Convert File to base64 data URL for preview
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
