import { Platform } from 'react-native'
import Constants from 'expo-constants'

const DEFAULT = 'http://localhost:5001/api'

function trimBase(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

/** Metro / Expo dev host (e.g. 192.168.1.12) — reachable from a physical device. */
function devMachineHost() {
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const host = hostUri.split(':')[0]
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host
  }

  const debuggerHost = Constants.expoGoConfig?.debuggerHost
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host
  }

  return null
}

/**
 * Resolve API base for React Native.
 * Web dev uses localhost; on a phone/emulator localhost points at the device itself.
 * When EXPO_PUBLIC_API_URL uses localhost in dev, swap to Metro host or 10.0.2.2 (Android emulator).
 */
export function resolveApiBaseUrl() {
  const configured = trimBase(process.env.EXPO_PUBLIC_API_URL) || DEFAULT

  if (!__DEV__) return configured

  try {
    const parsed = new URL(configured.includes('://') ? configured : `http://${configured}`)
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (!isLocal) return configured

    const devHost = devMachineHost()
    if (devHost) {
      parsed.hostname = devHost
      return trimBase(parsed.toString())
    }

    if (Platform.OS === 'android') {
      parsed.hostname = '10.0.2.2'
      return trimBase(parsed.toString())
    }

    return configured
  } catch {
    return DEFAULT
  }
}
