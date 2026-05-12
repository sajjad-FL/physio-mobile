import { memo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { loginTokens as t, loginType, loginLeading } from '../../theme/loginTokens'
import { font } from '../../theme/typography'
import { r } from '../../theme/radius'

function digitsOnly(text, maxLen) {
  const d = String(text || '').replace(/\D/g, '')
  return maxLen != null ? d.slice(0, maxLen) : d
}

function LoginMobileField({ label = 'Mobile number', value, onChangeText, error, placeholder = 'Enter mobile number' }) {
  const [focused, setFocused] = useState(false)

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldErr,
        ]}
      >
        <View style={styles.prefix}>
          <Text style={styles.prefixTxt}>+91</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={t.inkTertiary}
          keyboardType="phone-pad"
          autoCapitalize="none"
          maxLength={10}
          value={value}
          onChangeText={(txt) => onChangeText(digitsOnly(txt, 10))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontFamily: font.medium,
    fontSize: loginType.label,
    lineHeight: loginLeading.label,
    color: t.ink,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderWidth: 1,
    borderColor: t.inputBorder,
    borderRadius: r.md,
    backgroundColor: t.inputMutedBg,
    overflow: 'hidden',
  },
  fieldFocused: { borderColor: t.inputFocus },
  fieldErr: { borderColor: t.danger },
  prefix: {
    paddingLeft: 14,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: t.border,
    justifyContent: 'center',
    minHeight: 42,
  },
  prefixTxt: {
    fontFamily: font.semiBold,
    fontSize: loginType.prefix,
    lineHeight: loginLeading.prefix,
    color: t.inkMuted,
  },
  input: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: loginType.input,
    lineHeight: loginLeading.input,
    color: t.ink,
  },
  err: { marginTop: 6, fontFamily: font.regular, fontSize: 12, color: t.danger },
})

export default memo(LoginMobileField)
