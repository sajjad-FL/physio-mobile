/**
 * Treatment techniques for Book-by-Need (mobile).
 * Keep bookingIssue in sync with server TECHNIQUE_ISSUES.
 */
export const TECHNIQUES = [
  {
    slug: 'cupping-therapy',
    label: 'Cupping Therapy',
    bookingIssue: 'Cupping Therapy',
    image: require('../../assets/images/technique_cupping.png'),
    color: '#ea580c',
    bg: '#fff7ed',
    ring: '#fed7aa',
    intro:
      'Cupping uses gentle suction cups on the skin to ease muscle tension, improve local blood flow, and support recovery from stiffness and overuse.',
    expect: [
      'A short assessment of the painful or tight area',
      'Cups placed for a few minutes (often with a warm sensation)',
      'After-care tips for the same day',
    ],
  },
  {
    slug: 'dry-needling',
    label: 'Dry Needling',
    bookingIssue: 'Dry Needling',
    image: require('../../assets/images/technique_needling.png'),
    color: '#7c3aed',
    bg: '#f5f3ff',
    ring: '#ddd6fe',
    intro:
      'Dry needling targets tight muscle trigger points with fine sterile needles to reduce pain and restore movement.',
    expect: [
      'Discussion of your symptoms and any needle concerns',
      'Precise needling of selected muscle points',
      'Gentle movement advice afterwards',
    ],
  },
  {
    slug: 'kinesio-taping',
    label: 'Kinesio Taping',
    bookingIssue: 'Kinesio Taping',
    image: require('../../assets/images/technique_kinesio.png'),
    color: '#0d9488',
    bg: '#f0fdfa',
    ring: '#99f6e4',
    intro:
      'Kinesiology tape supports muscles and joints while you move — useful for sports, posture strain, and mild swelling.',
    expect: [
      'Assessment of the area that needs support',
      'Skin-safe tape applied in a specific pattern',
      'Guidance on wear time and activity',
    ],
  },
  {
    slug: 'iastm',
    label: 'IASTM',
    bookingIssue: 'IASTM',
    image: require('../../assets/images/technique_iastm.png'),
    color: '#0369a1',
    bg: '#f0f9ff',
    ring: '#bae6fd',
    intro:
      'IASTM (Instrument Assisted Soft Tissue Mobilization) uses specialized tools to break down scar tissue, ease fascial restrictions, and improve mobility in tight or overused areas.',
    expect: [
      'Assessment of the restricted or painful soft tissue',
      'Tool-assisted strokes along the muscle and fascia (often with redness)',
      'After-care tips for soreness and activity the same day',
    ],
  },
]

export function getTechniqueBySlug(slug) {
  return TECHNIQUES.find((t) => t.slug === String(slug || '').trim()) || null
}

export function getTechniqueByIssue(issue) {
  const key = String(issue || '').trim()
  return TECHNIQUES.find((t) => t.bookingIssue === key) || null
}
