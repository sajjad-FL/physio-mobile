/** Subset of client liveFieldValidation for mobile auth flows. */
import { validateIndianMobile } from './phoneIndia'

export function validateLoginPassword(value) {
  const str = value == null ? '' : String(value)
  if (!str) return 'Password is required'
  return str.length < 8 ? 'Password must be at least 8 characters' : ''
}

export function validateOtp(value) {
  const d = String(value).replace(/\D/g, '')
  if (!d) return 'Enter the code'
  if (d.length !== 6) return 'Enter the 6-digit code'
  return ''
}

export function validateName(value) {
  const t = String(value || '').trim()
  if (!t) return 'Full name is required'
  if (t.length < 2) return 'Name must be at least 2 characters'
  if (t.length > 120) return 'Name is too long'
  return ''
}

export function validateProfileEmail(value) {
  const t = String(value || '').trim()
  if (!t) return ''
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
  return ok ? '' : 'Enter a valid email'
}

export function validatePhoneField(value) {
  const pv = validateIndianMobile(value)
  return pv.valid ? '' : pv.message
}

export function validateDob(value) {
  const s = String(value || '').trim()
  if (!s) return 'Date of birth is required'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Use YYYY-MM-DD'
  return ''
}

export function validateGender(value, { requiredGender } = {}) {
  if (!requiredGender) return ''
  const t = String(value || '').trim()
  if (!t) return 'Gender is required'
  return ''
}

export function validateLocationBooking(value) {
  const t = String(value || '').trim()
  if (!t) return 'Location is required'
  if (t.length < 2) return 'Enter area or city (at least 2 characters)'
  return ''
}
