import { memo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { figmaTokens } from '../../../theme/figmaTokens'
import { signupTokens as t } from '../../../theme/signupTokens'
import { signupType, signupLeading } from '../../../theme/signupTypography'
import { font } from '../../../theme/typography'

const R = figmaTokens.radiusButton

/**
 * @param {'default' | 'solid'} appearance default: teal #0d6b6b (steps 1–2). solid: #005151 (profile create account).
 */
function SignupContinueButton({ title, onPress, loading, disabled, allCaps = false, appearance = 'default' }) {
  const raw = String(title || 'Continue').trim()
  const label = allCaps ? raw.toUpperCase() : raw
  const isSolid = appearance === 'solid'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { borderRadius: R },
        isSolid ? styles.btnSolid : styles.btnTeal,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && (isSolid ? styles.pressedSolid : styles.pressedTeal),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.surface} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.txt, allCaps ? styles.txtCaps : styles.txtSentence, isSolid && styles.txtSolidBg]}>
            {label}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={t.surface} style={styles.icon} />
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  btnTeal: { backgroundColor: t.brand },
  btnSolid: { backgroundColor: t.ctaSolid },
  pressedTeal: { backgroundColor: t.brandPressed },
  pressedSolid: { backgroundColor: t.ctaSolidPressed },
  disabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  txt: {
    fontSize: signupType.cta,
    lineHeight: signupLeading.cta,
    color: t.surface,
  },
  txtSentence: { fontFamily: font.medium, letterSpacing: 0.1 },
  txtCaps: { fontFamily: font.semiBold, letterSpacing: 0.6 },
  txtSolidBg: { fontFamily: font.medium },
  icon: { marginLeft: 6 },
})

export default memo(SignupContinueButton)
