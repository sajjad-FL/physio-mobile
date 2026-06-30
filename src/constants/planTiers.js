/**
 * Fixed home-visit plan tiers.
 *
 * discountPercent is applied to the patient's total price.
 * Physio earnings are always computed from the undiscounted subtotal (80% of base rate).
 *
 * At ₹500/session:
 *   7  days → ₹0 savings   (0%)
 *   15 days → ₹250 savings (~3.33%)
 *   30 days → ₹700 savings (~4.67%)
 */
export const PLAN_TIERS = [
  { label: '7 Days',  value: 7,  sessions: 7,  discountPercent: 0    },
  { label: '15 Days', value: 15, sessions: 15, discountPercent: 3.33 },
  { label: '30 Days', value: 30, sessions: 30, discountPercent: 4.67 },
]

export const PLAN_TIER_OPTIONS = PLAN_TIERS.map((t) => ({ label: t.label, value: t.value }))

/** Returns the tier object for a given sessions value, or null. */
export function getPlanTier(sessions) {
  return PLAN_TIERS.find((t) => t.sessions === Number(sessions)) ?? null
}
