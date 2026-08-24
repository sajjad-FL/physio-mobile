/** Fixed affixes shown in the physio name field (not stored in editable state). */
export const PHYSIO_NAME_PREFIX = 'Dr.'
export const PHYSIO_NAME_SUFFIX = 'PT'

/** Stored/displayed physiotherapist name: `Dr. {core} PT` */

export function stripPhysioNameAffixes(full) {
  let s = String(full || '').trim()
  s = s.replace(/^dr\.?\s*/i, '').trim()
  s = s.replace(/\s+pt\.?$/i, '').trim()
  return s
}

/** Keep only the editable middle segment (no Dr. / PT). */
export function sanitizePhysioNameCore(input) {
  return stripPhysioNameAffixes(input)
}

export function formatPhysioDisplayName(core) {
  const c = sanitizePhysioNameCore(core)
  if (!c) return ''
  return `${PHYSIO_NAME_PREFIX} ${c} ${PHYSIO_NAME_SUFFIX}`
}
