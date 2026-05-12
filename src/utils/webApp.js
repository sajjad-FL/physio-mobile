import { Linking } from 'react-native'

/** Base URL of the web client (same origin as Vite/React app). Set `EXPO_PUBLIC_SITE_URL` in `.env`. */
export function getWebSiteBaseUrl() {
  const u = process.env.EXPO_PUBLIC_SITE_URL
  if (typeof u === 'string' && u.trim()) return u.trim().replace(/\/+$/, '')
  return ''
}

export function getWebLoginUrl() {
  const base = getWebSiteBaseUrl()
  return base ? `${base}/login` : ''
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
