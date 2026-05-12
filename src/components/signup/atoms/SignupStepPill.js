import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

/**
 * @param {'outline' | 'filled'} variant outline: white pill + teal text (steps 1–2). filled: teal pill + white text (step 3).
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
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  filled: {
    backgroundColor: t.pillFilledBg,
    borderWidth: 0,
  },
  txt: {
    fontFamily: font.bold,
    fontSize: signupType.stepPill,
    lineHeight: signupLeading.stepPill,
    color: t.brand,
  },
  txtFilled: {
    color: t.pillFilledText,
  },
})

export default memo(SignupStepPill)
