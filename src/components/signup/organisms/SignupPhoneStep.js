import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import Card from '../../ui/Card'
import Input from '../../ui/Input'
import SignupHero from '../molecules/SignupHero'
import SignupContinueButton from '../molecules/SignupContinueButton'

const cardStyle = { borderRadius: 16 }

function SignupPhoneStep({
  step,
  totalSteps,
  phone,
  onChangePhone,
  phoneError,
  onContinue,
  sendingOtp,
}) {
  return (
    <>
      <SignupHero
        step={step}
        totalSteps={totalSteps}
        kickerLabel="CREATE ACCOUNT"
        title="Your phone number"
        subtitle="We will text a one-time code to verify this number. Date of birth, gender, and address can be added later in Profile."
      />
      <Card padding="lg" style={cardStyle}>
        <Input
          variant="signup"
          label="Mobile"
          placeholder="Enter your mobile number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={onChangePhone}
          error={phoneError}
        />
        <View style={styles.gapInner} />
        <SignupContinueButton title="Continue" onPress={onContinue} loading={sendingOtp} allCaps />
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  gapInner: { height: 20 },
})

export default memo(SignupPhoneStep)
