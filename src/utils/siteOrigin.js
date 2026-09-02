import { getWebSiteBaseUrl } from './webApp'

/** Public web origin for legal links (terms / privacy). */
export function siteOrigin() {
  return getWebSiteBaseUrl() || 'https://nearbyphysio.com'
}
