import { memo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

/** Match LoginScreen secondary CTA (teal50 fill, brand border). */
function SignupSecondaryButton({ title, onPress, loading, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.secondaryBtn,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.secondaryBtnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <Text style={styles.secondaryBtnTxt}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: { backgroundColor: colors.brandSoft },
  disabled: { opacity: 0.55 },
  secondaryBtnTxt: { fontFamily: font.semiBold, fontSize: type.md, color: colors.brand },
})

export default memo(SignupSecondaryButton)
