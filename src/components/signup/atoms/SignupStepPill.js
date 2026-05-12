import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../../theme/colors'
import { font, type, leading } from '../../../theme/typography'

/**
 * @param {'outline' | 'filled'} variant outline: white pill + brand text. filled: brand pill + white text (final step).
 * @param {boolean} compact filled pill uses "3/3"; outline uses "2 / 3".
 */
function SignupStepPill({ current, total, variant = 'outline', compact = false }) {
  const isFilled = variant === 'filled'
  const label = compact ? `${current}/${total}` : `${current} / ${total}`

  return (
    <View
      style={[styles.wrap, isFilled ? styles.filled : styles.outline]}
      accessibilityRole="text"
      accessibilityLabel={`Step ${current} of ${total}`}
    >
      <Text style={[styles.txt, isFilled && styles.txtFilled]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filled: {
    backgroundColor: colors.brand,
    borderWidth: 0,
  },
  txt: {
    fontFamily: font.bold,
    fontSize: type.sm,
    lineHeight: leading.sm,
    color: colors.brand,
  },
  txtFilled: {
    color: colors.white,
  },
})

export default memo(SignupStepPill)
