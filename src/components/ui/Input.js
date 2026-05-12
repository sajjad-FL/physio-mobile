import { memo, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { loginTokens as lu, loginType, loginLeading } from '../../theme/loginTokens'
import { signupTokens as su } from '../../theme/signupTokens'
import { signupType, signupLeading } from '../../theme/signupTypography'
import { font, type } from '../../theme/typography'
import { r } from '../../theme/radius'

function Input({
  label,
  error,
  hint,
  description,
  style,
  inputStyle,
  variant = 'default',
  signupMutedBg = false,
  ...props
}) {
  const isPasswordField = props.secureTextEntry === true
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  const isSignup = variant === 'signup'
  const isLogin = variant === 'login'

  const secureTextEntry = useMemo(() => {
    if (!isPasswordField) return props.secureTextEntry
    return !passwordVisible
  }, [isPasswordField, props.secureTextEntry, passwordVisible])

  const placeholderColor = isSignup ? su.inkTertiary : isLogin ? lu.inkTertiary : colors.textTertiary
  const focusStyle = isSignup ? styles.inputFocusedSignup : isLogin ? styles.inputFocusedLogin : styles.inputFocused
  const eyeSlot = isSignup ? styles.eyeBtnSignup : isLogin ? styles.eyeBtnLogin : null

  return (
    <View style={style}>
      {label ? (
        <Text
          style={[
            styles.label,
            isSignup && styles.labelSignup,
            isSignup && Boolean(description) && styles.labelSignupTight,
            isLogin && styles.labelLogin,
          ]}
        >
          {label}
        </Text>
      ) : null}
      {description && isSignup ? <Text style={styles.descriptionSignup}>{description}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={placeholderColor}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            isSignup && styles.inputSignup,
            isSignup && signupMutedBg && styles.inputSignupMuted,
            isLogin && styles.inputLogin,
            focused && focusStyle,
            error && styles.inputErr,
            isPasswordField && (isSignup || isLogin ? styles.inputWithEyeSignup : styles.inputWithEye),
            inputStyle,
          ]}
          {...props}
          secureTextEntry={secureTextEntry}
        />
        {isPasswordField ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}
            style={[styles.eyeBtn, eyeSlot]}
            onPress={() => setPasswordVisible((v) => !v)}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={isSignup ? su.inkMuted : isLogin ? lu.inkMuted : colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={[styles.err, isLogin && styles.errLogin]}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.slate700,
  },
  labelSignup: {
    marginBottom: 6,
    fontFamily: font.medium,
    fontSize: signupType.inputLabel,
    lineHeight: signupLeading.inputLabel,
    color: su.ink,
  },
  labelSignupTight: {
    marginBottom: 4,
  },
  descriptionSignup: {
    marginBottom: 8,
    marginTop: -2,
    fontFamily: font.medium,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.5,
    color: su.inkMuted,
  },
  inputWrap: { position: 'relative' },
  input: {
    minHeight: 42,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: r.md,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputSignup: {
    minHeight: 42,
    paddingVertical: 10,
    borderColor: su.inputBorder,
    borderRadius: r.md,
    fontSize: signupType.input,
    lineHeight: signupLeading.input,
    color: su.ink,
    backgroundColor: su.surface,
  },
  inputSignupMuted: {
    backgroundColor: su.inputMutedBg,
  },
  labelLogin: {
    marginBottom: 6,
    fontFamily: font.medium,
    fontSize: loginType.label,
    lineHeight: loginLeading.label,
    color: lu.ink,
  },
  inputLogin: {
    minHeight: 42,
    paddingVertical: 10,
    borderColor: lu.inputBorder,
    borderRadius: r.md,
    fontSize: loginType.input,
    lineHeight: loginLeading.input,
    color: lu.ink,
    backgroundColor: lu.inputMutedBg,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
  },
  inputFocusedSignup: {
    borderColor: su.inputFocus,
  },
  inputFocusedLogin: {
    borderColor: lu.inputFocus,
  },
  inputWithEye: { paddingRight: 40 },
  inputWithEyeSignup: { paddingRight: 40 },
  eyeBtn: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 36,
    height: 36,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtnSignup: {
    top: 4,
  },
  eyeBtnLogin: {
    top: 4,
  },
  inputErr: { borderColor: colors.danger },
  hint: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  err: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.red600 },
  errLogin: { color: lu.danger },
})

export default memo(Input)
