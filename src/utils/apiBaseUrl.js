import { resolveDevAccessibleUrl } from './resolveDevAccessibleUrl'

const DEFAULT = 'http://localhost:5001/api'

function trimBase(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

/**
 * Resolve API base for React Native.
 * Web dev uses localhost; on a phone/emulator localhost points at the device itself.
 * When EXPO_PUBLIC_API_URL uses localhost in dev, swap to Metro host or 10.0.2.2 (Android emulator).
 */
export function resolveApiBaseUrl() {
  const configured = trimBase(process.env.EXPO_PUBLIC_API_URL) || DEFAULT
  return resolveDevAccessibleUrl(configured) || configured
}
