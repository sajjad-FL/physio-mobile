import { Platform } from 'react-native'

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 2 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16 },
    android: { elevation: 4 },
    default: {},
  }),
  brand: Platform.select({
    ios: { shadowColor: '#0d9488', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 6 },
    android: { elevation: 3 },
    default: {},
  }),
}
