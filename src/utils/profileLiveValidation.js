/**
 * Mirrors client `liveFieldValidation.js` fields used by ProfilePage save + live patching.
 */

export function validateProfileLiveField(name, value, ctx = {}) {
  const v = value === undefined || value === null ? '' : value
  const str = typeof v === 'string' ? v : String(v)

  switch (name) {
    case 'name': {
      const t = str.trim()
      if (!t) return 'Full name is required'
      if (t.length < 2) return 'Name must be at least 2 characters'
      if (t.length > 120) return 'Name is too long'
      return ''
    }
    case 'profileEmail': {
      const t = str.trim()
      if (!t) return ''
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
      return ok ? '' : 'Enter a valid email'
    }
    case 'dob': {
      if (!str || !String(str).trim()) return 'Date of birth is required'
      const d = new Date(str)
      if (Number.isNaN(d.getTime())) return 'Invalid date of birth'
      const now = new Date()
      if (d > now) return 'Date of birth cannot be in the future'
      const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 18) return 'You must be at least 18 years old'
      if (age > 100) return 'Please check the date of birth'
      return ''
    }
    case 'gender': {
      const g = String(str).trim()
      if (!g) return ctx.requiredGender ? 'Gender is required' : ''
      if (!['female', 'male', 'other', 'prefer_not_to_say'].includes(g)) return 'Select a valid option'
      return ''
    }
    case 'address': {
      const t = str.trim()
      if (t.length > 500) return 'Address is too long (max 500 characters)'
      return ''
    }
    case 'location': {
      const mode = ctx.mode || 'physio'
      const t = str.trim()
      if (mode === 'booking') {
        if (!t) return 'Location is required'
        if (t.length < 2) return 'Enter area or city (at least 2 characters)'
        return ''
      }
      if (!t) return 'Coverage / location is required'
      if (t.length < 2) return 'Location must be at least 2 characters'
      if (t.length > 300) return 'Location is too long'
      return ''
    }
    case 'addressCoords': {
      const lat = ctx.addressLat
      const lng = ctx.addressLng
      const latUnset = lat == null || lat === ''
      const lngUnset = lng == null || lng === ''
      if (latUnset !== lngUnset) {
        return 'Address coordinates are incomplete. Re-select a place on the map or from search.'
      }
      return ''
    }
    case 'specialization': {
      const t = str.trim()
      if (!ctx.isPhysio) return ''
      if (!t) return 'Specialization is required for physiotherapists'
      if (t.length < 2) return 'Specialization must be at least 2 characters'
      if (t.length > 120) return 'Specialization is too long'
      return ''
    }
    case 'profileExperience': {
      if (str === '' || str == null) return ''
      const e = Number(str)
      if (!Number.isFinite(e) || e < 0) return 'Enter a valid number of years'
      if (e > 80) return 'Enter a realistic experience value'
      return ''
    }
    case 'profileFees': {
      if (str === '' || str == null) return ''
      const fee = Number(str)
      if (!Number.isFinite(fee) || fee < 0) return 'Enter a valid fee (₹)'
      if (fee > 500000) return 'Fee seems unreasonably high — please check'
      return ''
    }
    default:
      return ''
  }
}
