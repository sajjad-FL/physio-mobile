/** Match client `assetUrl`: `/uploads/...` → full origin URL for avatar images. */
export function assetUrl(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return null
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) return storedPath
  const rawBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api'
  const base = String(rawBase).trim().replace(/\/+$/, '')
  const origin = base.replace(/\/api\/?$/, '') || base
  const path = storedPath.startsWith('/') ? storedPath : `/${storedPath}`
  return `${origin}${path}`
}
