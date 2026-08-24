import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Input from '../../ui/Input'
import SignupHero from '../molecules/SignupHero'
import SignupDevOtpBanner from '../molecules/SignupDevOtpBanner'
import SignupContinueButton from '../molecules/SignupContinueButton'
import { authFormCard } from '../../../theme/authFormCard'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

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
  onChangePhone,
  resendIn = 0,
}) {
  const canResend = resendIn <= 0 && !sendingOtp
  return (
    <>
      <SignupHero
        heroIcon="chatbox-ellipses-outline"
        step={step}
        totalSteps={totalSteps}
        kickerLabel="CREATE ACCOUNT"
        title="Verify your number"
        subtitle="A 4-digit verification code has been sent via WhatsApp."
      />
      <View style={authFormCard}>
        <Input
          variant="login"
          label="Verification code"
          required
          placeholder="4-digit code"
          keyboardType="number-pad"
          value={otp}
          onChangeText={onChangeOtp}
          error={otpError}
        />
        {devOtpHint ? <SignupDevOtpBanner code={devOtpHint} /> : <View style={styles.spacer} />}
        {canResend ? (
          <Pressable onPress={onResend} style={styles.resendRow} hitSlop={8} disabled={sendingOtp}>
            <Text style={styles.resendTxt}>Didn't get it? </Text>
            <Text style={styles.resendLink}>{sendingOtp ? 'Sending…' : 'Resend code'}</Text>
          </Pressable>
        ) : (
          <Text style={styles.waitTxt}>
            Resend available in <Text style={styles.waitNum}>{resendIn}s</Text>
          </Text>
        )}
        <View style={styles.gapSm} />
        <SignupContinueButton title="Continue" onPress={onContinue} />
        {onChangePhone ? (
          <Pressable onPress={onChangePhone} style={styles.changePhone} hitSlop={8}>
            <Text style={styles.changePhoneTxt}>Change phone number</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  spacer: { height: 12 },
  gapSm: { height: 12 },
  resendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  resendTxt: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  resendLink: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.brand,
    textDecorationLine: 'underline',
  },
  waitTxt: {
    marginTop: 4,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textSecondary,
  },
  waitNum: { fontFamily: font.semiBold, color: colors.brand },
  changePhone: { marginTop: 14, alignItems: 'center' },
  changePhoneTxt: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
})

export default memo(SignupOtpStep)
