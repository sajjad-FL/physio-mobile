import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import Card from '../../ui/Card'
import Input from '../../ui/Input'
import SignupHero from '../molecules/SignupHero'
import SignupContinueButton from '../molecules/SignupContinueButton'
import { signupTokens as t } from '../../../theme/signupTokens'

const cardStyle = { borderRadius: 16 }

function SignupProfileStep({
  step,
  totalSteps,
  name,
  onChangeName,
  nameError,
  password,
  onChangePassword,
  passwordError,
  onSubmit,
  loading,
}) {
  return (
    <>
      <SignupHero
        layout="profile"
        titleSize="lg"
        stepPillVariant="filled"
        stepPillCompact
        step={step}
        totalSteps={totalSteps}
        kickerLabel="CREATE ACCOUNT"
        title="Almost there"
        subtitle="Your account is created with your name and password. Add date of birth, gender, and address in Profile when you are ready to book."
      />
      <Card padding="lg" style={cardStyle}>
        <Input
          variant="signup"
          signupMutedBg
          label="Full name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={onChangeName}
          error={nameError}
        />
        <View style={styles.divider} />
        <Input
          variant="signup"
          signupMutedBg
          label="Create password"
          description="PASSWORD (MIN 8 CHARACTERS)"
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={onChangePassword}
          error={passwordError}
        />
        <View style={styles.gapInner} />
        <SignupContinueButton title="Create account" onPress={onSubmit} loading={loading} appearance="solid" />
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.border,
    marginVertical: 20,
  },
  gapInner: { height: 20 },
})

export default memo(SignupProfileStep)
