/** Public web origin for legal links (terms / privacy). */
export function siteOrigin() {
  const u = typeof process.env.EXPO_PUBLIC_SITE_URL === 'string' ? process.env.EXPO_PUBLIC_SITE_URL.trim() : ''
  return u ? u.replace(/\/$/, '') : 'https://nearbyphysio.com'
}
