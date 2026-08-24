export const MOBILE_PLAN_TIER_STYLE = {
  7: {
    icon: 'calendar-outline',
    bg: '#ffffff',
    border: '#e2e8f0',
    color: '#0d6b6b',
    titleColor: '#0f172a',
  },
  15: {
    icon: 'pulse-outline',
    bg: '#f4fbf7',
    border: '#a7f3d0',
    color: '#059669',
    titleColor: '#064e3b',
  },
  30: {
    icon: 'shield-checkmark-outline',
    bg: '#f0f9ff',
    border: '#bae6fd',
    color: '#0284c7',
    titleColor: '#0c4a6e',
  },
}

export function buildMobilePlanTierCards(planTiers) {
  if (!Array.isArray(planTiers) || planTiers.length === 0) return []
  return planTiers.map((tier) => {
    const style = MOBILE_PLAN_TIER_STYLE[tier.sessions] || MOBILE_PLAN_TIER_STYLE[7]
    const d = Number(tier.defaultDiscountPercent) || 0
    return {
      sessions: tier.sessions,
      label: tier.label,
      badge: tier.badge,
      discountPercent: d,
      desc: tier.description,
      saveCallout: d > 0 ? `SAVE ${d % 1 === 0 ? d : d.toFixed(2)}%` : null,
      ...style,
    }
  })
}

export const FALLBACK_PLAN_TIER_CARDS = buildMobilePlanTierCards([
  {
    sessions: 7,
    defaultDiscountPercent: 0,
    label: '7-Day Plan',
    badge: 'STARTER',
    description: '7 daily home sessions. Pay 1 session upfront, 100% by session 5.',
  },
  {
    sessions: 15,
    defaultDiscountPercent: 3.33,
    label: '15-Day Plan',
    badge: 'MOST POPULAR',
    description: '15 sessions. Pay 50% by session 5, 100% by session 12.',
  },
  {
    sessions: 30,
    defaultDiscountPercent: 4.67,
    label: '30-Day Plan',
    badge: 'BEST VALUE',
    description: '30 sessions. Pay 50% by session 10, 75% by session 20, 100% by session 25.',
  },
])
