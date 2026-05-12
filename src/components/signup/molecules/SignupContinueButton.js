import { memo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

/** Match LoginScreen primary CTA (height 44, radius 12, brand shadow). */
function SignupContinueButton({ title, onPress, loading, disabled, allCaps = false, appearance: _appearance }) {
  const raw = String(title || 'Continue').trim()
  const label = allCaps ? raw.toUpperCase() : raw

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && !loading && styles.primaryBtnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.row}>
          <Text style={styles.primaryBtnTxt}>{label}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.white} />
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnPressed: { backgroundColor: colors.brandHover },
  btnDisabled: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white, letterSpacing: 0.1 },
})

export default memo(SignupContinueButton)
