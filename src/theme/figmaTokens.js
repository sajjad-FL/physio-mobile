/**
 * PhysioKhom — shared tokens from HTML references (Sign up steps 1–3, Sign in, Landing).
 * Teal CTAs: #0d6b6b · Solid primary (Sign in / Create account): #005151 · Canvas: #f9f9fc / signup #f8fafc
 */
import { Platform } from 'react-native'

export const figmaTokens = {
  /** App marketing + login shell */
  canvas: '#f9f9fc',
  /** Sign up flow background (OTP / refined step 1 alt) */
  signupCanvas: '#f8fafc',
  surface: '#ffffff',

  /** Teal — accents, links, sign-up continue (steps 1–2), landing hero CTA */
  primary: '#0d6b6b',
  /** Dark green — Sign in, profile “Create account”, headline emphasis */
  primaryDark: '#005151',
  primaryPressed: '#094f4f',
  /** From solid button hover (M3 primary-container) */
  primarySolidHover: '#0d6b6b',

  ink: '#1a1c1e',
  inkSecondary: '#1a1c1e',
  body: '#3f4948',
  muted: '#64748b',
  mutedLabel: '#64748b',
  tertiary: '#94a3b8',

  border: '#e5e7eb',
  borderGray300: '#d1d5db',
  borderSoft: 'rgba(190, 201, 200, 0.45)',
  outlineVariant: '#bec9c8',

  badgeMint: 'rgba(162, 240, 239, 0.5)',
  primaryLight: '#a2f0ef',
  mintSoft: '#e6f4f3',
  line: '#e8e8e8',
  faqStripe: '#a2f0ef',
  glow: 'rgba(162, 240, 239, 0.45)',

  /** Step 3 filled pill (primary-container + on-primary-container) */
  pillFilledBg: '#0d6b6b',
  pillFilledText: '#9be9e8',

  radiusHero: 16,
  radiusCard: 8,
  radiusCardLg: 10,
  radiusButton: 6,
  radiusPill: 999,
  padScreen: 14,
  padCard: 10,
}

export const figmaShadowCard = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
  },
  android: { elevation: 4 },
  default: {},
})

export const figmaShadowSm = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  default: {},
})

/** Sticky CTA / glow (landing reference) */
export const figmaShadowGlow = Platform.select({
  ios: {
    shadowColor: '#0d6b6b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  android: { elevation: 3 },
  default: {},
})
