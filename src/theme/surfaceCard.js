import { colors } from './colors'
import { r } from './radius'

/** Subtle elevation for white cards on the canvas background. */
export const surfaceCardShadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
}

/** Base white surface — avoids the frosted double-frame look on `colors.canvas`. */
export const surfaceCardBase = {
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  overflow: 'hidden',
}

/** Standalone list/item card (bookings, disputes, stats). */
export const surfaceCard = {
  ...surfaceCardBase,
  borderRadius: r['2xl'],
  ...surfaceCardShadow,
}

/** Grouped list shell (activity feed, wallet transactions). */
export const surfaceListShell = {
  ...surfaceCardBase,
  borderRadius: r['2xl'],
  ...surfaceCardShadow,
}

/** Larger section/form card. */
export const surfaceSectionCard = {
  ...surfaceCardBase,
  borderRadius: r['2xl'],
  ...surfaceCardShadow,
}
