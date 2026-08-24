/** Match client `assetUrl`: `/uploads/...` → full origin URL for avatar images. */
import { resolveApiBaseUrl } from './apiBaseUrl'

export function assetUrl(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return null
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) return storedPath
  const base = resolveApiBaseUrl()
  const origin = base.replace(/\/api\/?$/, '') || base
  const path = storedPath.startsWith('/') ? storedPath : `/${storedPath}`
  return `${origin}${path}`
}
