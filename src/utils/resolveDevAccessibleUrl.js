import { Platform } from 'react-native'
import Constants from 'expo-constants'

function trimBase(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

/** Metro / Expo dev host (e.g. 192.168.1.12) — reachable from a physical device. */
export function devMachineHost() {
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
 * Rewrite localhost URLs so they work on a phone/emulator in dev.
 * Web/API dev on the laptop uses localhost; on device that means the device itself.
 */
export function resolveDevAccessibleUrl(url) {
  const configured = trimBase(url)
  if (!configured) return ''
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
    return configured
  }
}
