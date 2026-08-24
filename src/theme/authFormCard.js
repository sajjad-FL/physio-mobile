import { Platform } from 'react-native'
import { colors } from './colors'

/** Matches LoginScreen form card (white surface + shadow). */
export const authFormCardShadow = {
  shadowColor: colors.brand,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: Platform.OS === 'android' ? 0 : 4,
}

export const authFormCard = {
  backgroundColor: colors.white,
  borderRadius: 20,
  padding: 20,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  overflow: 'hidden',
  ...authFormCardShadow,
}
