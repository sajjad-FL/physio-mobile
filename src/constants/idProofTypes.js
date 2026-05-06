export const ID_PROOF_TYPE_VALUES = Object.freeze(['aadhaar', 'pan', 'passport', 'voter_id'])

export const ID_PROOF_TYPE_OPTIONS = Object.freeze([
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'pan', label: 'PAN' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
])

export function isValidIdProofType(v) {
  return ID_PROOF_TYPE_VALUES.includes(String(v ?? '').trim().toLowerCase())
}
