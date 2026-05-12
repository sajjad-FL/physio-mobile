/**
 * Sign in — M3 premium HTML (primary #005151, teal accents #0d6b6b, surface #f9f9fc).
 */
import { figmaTokens as F } from './figmaTokens'

export const loginTokens = {
  canvas: F.canvas,
  surface: F.surface,
  /** Links, header brand, forgot */
  brand: F.primaryDark,
  brandAccent: F.primary,
  brandPressed: F.primarySolidHover,
  /** Sign in button fill */
  brandSolid: F.primaryDark,
  brandSolidPressed: F.primarySolidHover,
  ink: F.inkSecondary,
  inkMuted: F.muted,
  body: F.body,
  inkTertiary: F.tertiary,
  border: F.border,
  inputBorder: F.outlineVariant,
  /** M3 outline — secondary button border */
  outline: '#6f7979',
  inputFocus: F.primary,
  inputMutedBg: F.canvas,
  danger: '#ba1a1a',
  dangerBg: '#ffdad6',
  dangerBorder: '#fecaca',
}

export const loginType = {
  brandTitle: 18,
  homeLink: 11,
  title: 22,
  subtitle: 14,
  label: 13,
  input: 14,
  prefix: 14,
  button: 14,
  link: 13,
  legal: 12,
}

export const loginLeading = {
  brandTitle: 24,
  homeLink: 16,
  title: 28,
  subtitle: 20,
  label: 18,
  input: 20,
  prefix: 20,
  button: 20,
  link: 18,
  legal: 17,
}
