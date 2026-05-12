import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import Card from '../../ui/Card'
import Input from '../../ui/Input'
import SignupHero from '../molecules/SignupHero'
import SignupDevOtpBanner from '../molecules/SignupDevOtpBanner'
import SignupContinueButton from '../molecules/SignupContinueButton'
import SignupSecondaryButton from '../molecules/SignupSecondaryButton'

const cardStyle = { borderRadius: 16 }

function SignupOtpStep({
  step,
  totalSteps,
  otp,
  onChangeOtp,
  otpError,
  devOtpHint,
  onResend,
  sendingOtp,
  onContinue,
}) {
  return (
    <>
      <SignupHero
        titleSize="md"
        step={step}
        totalSteps={totalSteps}
        kickerLabel="CREATE ACCOUNT"
        title="Verify your number"
        subtitle="Enter the 6-digit code we sent to your phone."
      />
      <Card padding="lg" style={cardStyle}>
        <Input
          variant="signup"
          label="6-digit OTP"
          placeholder="Enter the 6-digit code"
          keyboardType="number-pad"
          value={otp}
          onChangeText={onChangeOtp}
          error={otpError}
        />
        {devOtpHint ? <SignupDevOtpBanner code={devOtpHint} /> : <View style={styles.spacer} />}
        <SignupSecondaryButton title="Resend code" onPress={onResend} loading={sendingOtp} />
        <View style={styles.gapSm} />
        <SignupContinueButton title="Continue" onPress={onContinue} />
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  spacer: { height: 12 },
  gapSm: { height: 12 },
})

export default memo(SignupOtpStep)
