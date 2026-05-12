import { memo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { loginTokens as t, loginType, loginLeading } from '../../theme/loginTokens'
import { font } from '../../theme/typography'
import { figmaTokens } from '../../theme/figmaTokens'

function LoginPrimaryButton({ title, onPress, loading, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.surface} />
      ) : (
        <Text style={styles.txt}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 36,
    borderRadius: figmaTokens.radiusButton,
    backgroundColor: t.brandSolid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pressed: { backgroundColor: t.brandSolidPressed },
  disabled: { opacity: 0.55 },
  txt: {
    fontFamily: font.semiBold,
    fontSize: loginType.button,
    lineHeight: loginLeading.button,
    color: t.surface,
  },
})

export default memo(LoginPrimaryButton)
