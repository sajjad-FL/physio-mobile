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
