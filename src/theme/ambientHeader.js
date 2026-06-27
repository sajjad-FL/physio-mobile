import { colors } from './colors'

/** Shared ambient header glow — matches web dashboard halo pattern. */
export const ambientHeaderGlow = {
  position: 'absolute',
  top: -120,
  left: -60,
  right: -60,
  height: 380,
  borderRadius: 190,
  backgroundColor: colors.teal50,
  opacity: 0.55,
  zIndex: 0,
}

export const ambientHeaderGlow2 = {
  position: 'absolute',
  top: -50,
  left: '20%',
  width: '60%',
  height: 200,
  borderRadius: 100,
  backgroundColor: colors.brandSoft,
  opacity: 0.35,
  zIndex: 0,
}
