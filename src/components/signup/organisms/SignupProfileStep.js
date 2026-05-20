import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { font, type } from '../../../theme/typography'
import Input from '../../ui/Input'
import SignupHero from '../molecules/SignupHero'
import SignupContinueButton from '../molecules/SignupContinueButton'
import { authFormCard } from '../../../theme/authFormCard'

function SignupProfileStep({
  step,
  totalSteps,
  name,
  onChangeName,
  nameError,
  password,
  onChangePassword,
  passwordError,
  referralCode,
  onChangeReferralCode,
  referralSignupBonus = 0,
  onSubmit,
  loading,
}) {
  return (
    <>
      <SignupHero
        heroIcon="checkmark-circle-outline"
        layout="profile"
        stepPillVariant="filled"
        stepPillCompact
        step={step}
        totalSteps={totalSteps}
        kickerLabel="CREATE ACCOUNT"
        title="Almost there"
      />
      <View style={authFormCard}>
        <Input
          variant="login"
          label="Full name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={onChangeName}
          error={nameError}
        />
        <Input
          variant="login"
          style={styles.passwordField}
          label="Create password"
          description="PASSWORD (MIN 8 CHARACTERS)"
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={onChangePassword}
          error={passwordError}
        />
        <Input
          variant="login"
          style={styles.passwordField}
          label="Referral code (optional)"
          placeholder="e.g. ABC123"
          autoCapitalize="characters"
          value={referralCode}
          onChangeText={onChangeReferralCode}
        />
        {referralCode && referralSignupBonus > 0 ? (
          <Text style={styles.referralHint}>
            You&apos;ll receive ₹{referralSignupBonus} wallet credit after signup with this code.
          </Text>
        ) : null}
        <View style={styles.gapInner} />
        <SignupContinueButton title="Create account" onPress={onSubmit} loading={loading} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  /** Same rhythm as LoginScreen `fieldGap` between stacked fields. */
  passwordField: { marginTop: 12 },
  referralHint: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: '#5b21b6',
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  gapInner: { height: 16 },
})

export default memo(SignupProfileStep)
