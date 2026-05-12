import { PHYSIO_DASHBOARD_ENTRY } from '../constants/authPaths'
import { getRoleSync } from './tokenStore'

/** Default stack/screen name after login (React Navigation). */
export function getDefaultDashboardScreen() {
  const r = getRoleSync()
  if (r === 'admin') return 'Unauthorized'
  if (r === 'physio') return PHYSIO_DASHBOARD_ENTRY
  return 'UserTabs'
}
