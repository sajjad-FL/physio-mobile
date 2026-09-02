import { Linking } from 'react-native'
import { resolveDevAccessibleUrl } from './resolveDevAccessibleUrl'

function trimBase(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

/** Local dev serves the web client on Vite (5173); API stays on 5001. */
function normalizeLocalDevSiteUrl(url) {
  if (!__DEV__ || !url) return url
  try {
    const parsed = new URL(url.includes('://') ? url : `http://${url}`)
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (isLocal && parsed.port === '5001') {
      parsed.port = '5173'
    }
    return trimBase(parsed.toString())
  } catch {
    return url
  }
}

/** Base URL of the web client (same origin as Vite/React app). Set `EXPO_PUBLIC_SITE_URL` in `.env`. */
export function getWebSiteBaseUrl() {
  const configured = trimBase(process.env.EXPO_PUBLIC_SITE_URL)
  if (!configured) return ''
  const normalized = normalizeLocalDevSiteUrl(configured)
  return resolveDevAccessibleUrl(normalized) || normalized
}

export function getWebLoginUrl() {
  const base = getWebSiteBaseUrl()
  return base ? `${base}/login` : ''
}

export function getWebManagerUrl() {
  const base = getWebSiteBaseUrl()
  return base ? `${base}/manager` : ''
}

export function getWebClinicUrl() {
  const base = getWebSiteBaseUrl()
  return base ? `${base}/clinic` : ''
}

/** Opens web app sign-in in the system browser (admin/staff use the web dashboard). */
export async function openWebLoginInBrowser() {
  const url = getWebLoginUrl()
  if (!url) return false
  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) return false
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

/** Opens care manager dashboard in the system browser. */
export async function openWebManagerInBrowser() {
  const url = getWebManagerUrl()
  if (!url) return false
  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) return false
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

/** Opens clinic staff dashboard in the system browser. */
export async function openWebClinicInBrowser() {
  const url = getWebClinicUrl()
  if (!url) return false
  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) return false
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}
