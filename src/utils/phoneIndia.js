/** Same rules as client/src/utils/phoneIndia.js */

export function normalizeIndianPhone(phone) {
  if (phone == null) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  if (!cleaned) return ''

  while (cleaned.startsWith('00') && cleaned.length > 10) {
    cleaned = cleaned.slice(2)
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1)
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2)
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(-10)
  }

  return cleaned
}

export function isValidIndianMobileTenDigits(cleaned) {
  if (!cleaned || cleaned.length !== 10) return false
  return /^[6-9]\d{9}$/.test(cleaned)
}

export function validateIndianMobile(input) {
  const normalized = normalizeIndianPhone(input)
  if (!normalized) {
    return { valid: false, normalized: null, message: 'Phone number is required' }
  }
  if (normalized.length !== 10) {
    return { valid: false, normalized: null, message: 'Enter a valid 10-digit Indian mobile number' }
  }
  if (!isValidIndianMobileTenDigits(normalized)) {
    return {
      valid: false,
      normalized: null,
      message: 'Enter a valid Indian mobile number (starts with 6–9)',
    }
  }
  return { valid: true, normalized }
}
