import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import SignupStepPill from '../atoms/SignupStepPill'
import SignupKickerBadge from '../atoms/SignupKickerBadge'
import SignupTitle from '../atoms/SignupTitle'
import SignupSubtitle from '../atoms/SignupSubtitle'

/**
 * @param {'default' | 'profile'} layout default: pill → kicker → title → subtitle. profile: pill → title → kicker → subtitle.
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
  titleSize = 'sm',
}) {
  const pill = (
    <SignupStepPill current={step} total={totalSteps} variant={stepPillVariant} compact={stepPillCompact} />
  )
  const kicker = <SignupKickerBadge label={kickerLabel} />
  const h = (
    <SignupTitle size={titleSize}>{title}</SignupTitle>
  )
  const sub = <SignupSubtitle>{subtitle}</SignupSubtitle>

  if (layout === 'profile') {
    return (
      <View style={styles.hero}>
        {pill}
        {h}
        {kicker}
        {sub}
      </View>
    )
  }

  return (
    <View style={styles.hero}>
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
})

export default memo(SignupHero)
