import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import SignupStepPill from '../atoms/SignupStepPill'
import SignupKickerBadge from '../atoms/SignupKickerBadge'
import SignupTitle from '../atoms/SignupTitle'
import SignupSubtitle from '../atoms/SignupSubtitle'
import { colors } from '../../../theme/colors'

/**
 * @param {'default' | 'profile'} layout default: icon → pill → kicker → title → subtitle. profile: icon → pill → title → kicker → subtitle.
 * @param {string} [heroIcon] Ionicons name — same 68×68 brand tile as LoginScreen hero.
 */
function SignupHero({
  step,
  totalSteps,
  kickerLabel,
  title,
  subtitle,
  layout = 'default',
  stepPillVariant = 'outline',
  stepPillCompact = false,
  heroIcon,
}) {
  const iconTile =
    heroIcon != null ? (
      <View style={styles.heroIconWrap}>
        <Ionicons name={heroIcon} size={32} color={colors.white} />
      </View>
    ) : null

  const pill = (
    <SignupStepPill current={step} total={totalSteps} variant={stepPillVariant} compact={stepPillCompact} />
  )
  const kicker = <SignupKickerBadge label={kickerLabel} />
  const h = <SignupTitle>{title}</SignupTitle>
  const sub =
    subtitle != null && String(subtitle).trim() !== '' ? (
      <SignupSubtitle>{subtitle}</SignupSubtitle>
    ) : null

  if (layout === 'profile') {
    return (
      <View style={styles.hero}>
        {iconTile}
        {pill}
        {h}
        {kicker}
        {sub}
      </View>
    )
  }

  return (
    <View style={styles.hero}>
      {iconTile}
      {pill}
      {kicker}
      {h}
      {sub}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 24,
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
})

export default memo(SignupHero)
