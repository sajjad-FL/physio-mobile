import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { font, type, leading } from '../../../theme/typography'
import { colors } from '../../../theme/colors'
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
  referralError,
  referralSignupBonus = 0,
  onSubmit,
  onBackToCode,
  loading,
}) {
  const code = String(referralCode || '').trim()
  const looksComplete = code.length === 6
  const showBonusHint = looksComplete && referralSignupBonus > 0 && !referralError
  const showSoftHint = code.length > 0 && code.length < 6 && !referralError

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
        subtitle="Your account is created with your name and password. Add date of birth, gender, and address in Profile whenever you like — you will need them before booking."
      />
      <View style={authFormCard}>
        <Input
          variant="login"
          label="What's your name?"
          required
          placeholder="Enter your full name"
          value={name}
          onChangeText={onChangeName}
          error={nameError}
        />
        <Input
          variant="login"
          style={styles.passwordField}
          label="Create password"
          required
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={onChangePassword}
          error={passwordError}
          hint="At least 6 characters — this is what you’ll use to sign in."
        />

        <View style={[styles.referralCard, referralError ? styles.referralCardError : null]}>
          <Text style={styles.referralLabel}>
            Referral code <Text style={styles.optional}>(optional)</Text>
          </Text>
          <Text style={styles.referralHelp}>
            Have a code from a friend? Enter it for a welcome wallet credit.
          </Text>
          <Input
            variant="login"
            style={styles.referralInput}
            label=""
            placeholder="6-character code"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            value={referralCode}
            onChangeText={onChangeReferralCode}
            error={referralError}
          />
          {showSoftHint ? (
            <Text style={styles.softHint}>Referral codes are usually 6 characters.</Text>
          ) : null}
          {showBonusHint ? (
            <View style={styles.bonusRow}>
              <Ionicons name="gift-outline" size={16} color={colors.brand} />
              <Text style={styles.bonusTxt}>
                If this code is valid, you’ll get ₹{referralSignupBonus} wallet credit after signup.
              </Text>
            </View>
          ) : null}
          {referralError ? (
            <Pressable
              onPress={() => onChangeReferralCode?.('')}
              style={styles.skipReferral}
              hitSlop={8}
            >
              <Text style={styles.skipReferralTxt}>Clear code and continue without referral</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.gapInner} />
        <SignupContinueButton title="Create account" onPress={onSubmit} loading={loading} />
        {onBackToCode ? (
          <Pressable onPress={onBackToCode} style={styles.backLink} hitSlop={8}>
            <Text style={styles.backLinkTxt}>Back to code</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  passwordField: { marginTop: 12 },
  referralCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
  },
  referralCardError: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(254, 242, 242, 0.5)',
  },
  referralLabel: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optional: {
    fontFamily: font.regular,
    color: colors.textTertiary,
  },
  referralHelp: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: leading.xs,
    marginBottom: 10,
  },
  referralInput: { marginTop: 0 },
  softHint: {
    marginTop: 6,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.textTertiary,
  },
  bonusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.14)',
  },
  bonusTxt: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.brand,
    lineHeight: 17,
  },
  skipReferral: { marginTop: 10 },
  skipReferralTxt: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  gapInner: { height: 16 },
  backLink: { marginTop: 14, alignItems: 'center' },
  backLinkTxt: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
})

export default memo(SignupProfileStep)
