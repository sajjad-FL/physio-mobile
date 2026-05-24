import { USER_DASHBOARD_ENTRY } from '../constants/authPaths'
import { getRoleSync } from './tokenStore'

/** Default stack/screen name after login (React Navigation). */
export function getDefaultDashboardScreen() {
  const r = getRoleSync()
  if (r === 'admin' || r === 'physio') return 'Unauthorized'
  return USER_DASHBOARD_ENTRY
}
