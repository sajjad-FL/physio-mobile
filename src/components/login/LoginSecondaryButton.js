import { memo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { loginTokens as t, loginType, loginLeading } from '../../theme/loginTokens'
import { font } from '../../theme/typography'
import { figmaTokens } from '../../theme/figmaTokens'

function LoginSecondaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.txt}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 36,
    borderRadius: figmaTokens.radiusButton,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.outline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.92, backgroundColor: t.canvas },
  disabled: { opacity: 0.55 },
  txt: {
    fontFamily: font.medium,
    fontSize: loginType.button,
    lineHeight: loginLeading.button,
    color: t.brandSolid,
  },
})

export default memo(LoginSecondaryButton)
