import { PHYSIO_DASHBOARD_ENTRY, USER_DASHBOARD_ENTRY } from '../constants/authPaths'
import { getRoleSync } from './tokenStore'

/** Default stack/screen name after login (React Navigation). */
export function getDefaultDashboardScreen() {
  const r = getRoleSync()
  if (r === 'admin' || r === 'care_manager' || r === 'clinic_staff') return 'Unauthorized'
  if (r === 'physio') return PHYSIO_DASHBOARD_ENTRY
  return USER_DASHBOARD_ENTRY
}
