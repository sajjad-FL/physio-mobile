import { memo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import SignupHero from '../molecules/SignupHero'
import SignupContinueButton from '../molecules/SignupContinueButton'
import { authFormCard } from '../../../theme/authFormCard'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

function digitsOnly(text, maxLen) {
  const d = String(text || '').replace(/\D/g, '')
  return maxLen != null ? d.slice(0, maxLen) : d
}

function SignupPhoneStep({
  step,
  totalSteps,
  phone,
  onChangePhone,
  phoneError,
  onContinue,
  sendingOtp,
}) {
  const [focused, setFocused] = useState(false)

  return (
    <>
      <SignupHero
        heroIcon="person-add-outline"
        step={step}
        totalSteps={totalSteps}
        kickerLabel="CREATE ACCOUNT"
        title="Your phone number"
        subtitle="We will text a one-time code to verify this number."
      />
      <View style={authFormCard}>
        <Text style={styles.fieldLabel}>Mobile number</Text>
        <View
          style={[
            styles.mobileField,
            focused && styles.fieldFocused,
            Boolean(phoneError) && styles.fieldError,
          ]}
        >
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixTxt}>+91</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Enter mobile number"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            autoCapitalize="none"
            textContentType="telephoneNumber"
            autoComplete="tel"
            importantForAutofill="yes"
            autoCorrect={false}
            maxLength={10}
            value={phone}
            onChangeText={(txt) => onChangePhone(digitsOnly(txt, 10))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        {phoneError ? <Text style={styles.fieldErrTxt}>{phoneError}</Text> : null}

        <View style={styles.spacer16} />

        <SignupContinueButton title="Continue" onPress={onContinue} loading={sendingOtp} allCaps />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  fieldLabel: { marginBottom: 6, fontFamily: font.medium, fontSize: type.base, color: colors.textPrimary },
  mobileField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  fieldError: { borderColor: colors.danger },
  phonePrefix: {
    paddingLeft: 14,
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderSubtle,
    justifyContent: 'center',
    height: 46,
  },
  phonePrefixTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  textInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
  },
  fieldErrTxt: { marginTop: 5, fontFamily: font.regular, fontSize: type.sm, color: colors.danger },
  spacer16: { height: 16 },
})

export default memo(SignupPhoneStep)
