/**
 * Display physio fee as a fixed per-session amount.
 * @param {{ pricePerSession?: unknown } | null | undefined} p
 */
export function formatPhysioSessionFeeLabel(p) {
  if (!p) return '—'
  const lo = Number(p.pricePerSession)
  if (!Number.isFinite(lo) || lo < 0) return '—'
  return `₹${lo}`
}
