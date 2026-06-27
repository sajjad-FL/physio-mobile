/**
 * Typography tokens.
 * Font families map to loaded Inter variants (see App.js for useFonts).
 * Fallback to system font if fonts haven't loaded yet.
 */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_700Bold',
}

/** Font size scale (px) — compact mobile default; use across screens. */
export const type = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  '2xl': 19,
  '3xl': 22,
}

/** Line-height scale paired with type sizes. */
export const leading = {
  xs: 14,
  sm: 16,
  base: 19,
  md: 21,
  lg: 23,
  xl: 25,
  '2xl': 27,
  '3xl': 29,
}

/** Micro label (9px) — web dashboard stat labels. */
export const typeMicro = 9

/**
 * Semantic text presets mirroring web mobile `type-*` utilities (index.css, max-width 639px).
 * Spread into StyleSheet entries: { ...textStyles.pageTitle }
 */
export const textStyles = {
  pageTitle: {
    fontFamily: font.bold,
    fontSize: type.xl,
    lineHeight: leading.xl,
    letterSpacing: -0.3,
  },
  stat: {
    fontFamily: font.bold,
    fontSize: type['2xl'],
    lineHeight: leading['2xl'],
  },
  body: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
  },
  caption: {
    fontFamily: font.regular,
    fontSize: type.sm,
    lineHeight: leading.sm,
  },
  label: {
    fontFamily: font.medium,
    fontSize: type.base,
    lineHeight: leading.base,
  },
  button: {
    fontFamily: font.semiBold,
    fontSize: type.md,
    lineHeight: leading.md,
  },
  micro: {
    fontFamily: font.bold,
    fontSize: typeMicro,
    lineHeight: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    lineHeight: leading.sm,
  },
  productName: {
    fontFamily: font.semiBold,
    fontSize: type.md,
    lineHeight: leading.md,
  },
  productCta: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    lineHeight: leading.sm,
  },
}
