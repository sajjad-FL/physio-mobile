import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
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
        <View style={styles.gapInner} />
        <SignupContinueButton title="Create account" onPress={onSubmit} loading={loading} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  /** Same rhythm as LoginScreen `fieldGap` between stacked fields. */
  passwordField: { marginTop: 12 },
  gapInner: { height: 16 },
})

export default memo(SignupProfileStep)
