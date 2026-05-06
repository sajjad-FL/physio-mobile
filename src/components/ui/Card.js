import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
})

export default memo(Card)

