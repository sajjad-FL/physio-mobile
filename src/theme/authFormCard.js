import { Platform } from 'react-native'
import { colors } from './colors'

/** Matches LoginScreen form card (white surface + shadow). */
export const authFormCardShadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 4 },
  default: {},
})

export const authFormCard = {
  backgroundColor: colors.white,
  borderRadius: 20,
  padding: 20,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  ...authFormCardShadow,
}
