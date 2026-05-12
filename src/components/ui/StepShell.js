import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Card from './Card'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { r } from '../../theme/radius'

/**
 * Numbered step card used in multi-step booking/onboarding flows.
 * Props: step (number), title, subtitle, locked, children
 */
function StepShell({ step, title, subtitle, locked = false, children }) {
  return (
    <Card style={[styles.card, locked && styles.cardLocked]}>
      <View style={styles.head}>
        <View style={[styles.badge, locked && styles.badgeLocked]}>
          <Text style={[styles.badgeTxt, locked && styles.badgeTxtLocked]}>{step}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={[styles.title, locked && styles.titleLocked]}>{title}</Text>
          {subtitle ? <Text style={[styles.sub, locked && styles.subLocked]}>{subtitle}</Text> : null}
        </View>
      </View>
      <View pointerEvents={locked ? 'none' : 'auto'}>{children}</View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  cardLocked: { opacity: 0.55, borderColor: colors.slate100 },
  head: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14 },
  badge: {
    width: 26, height: 26, borderRadius: r.full,
    backgroundColor: colors.blue600,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  badgeLocked: { backgroundColor: colors.slate200 },
  badgeTxt: { fontFamily: font.bold, fontSize: type.xs, color: colors.white },
  badgeTxtLocked: { color: colors.slate400 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  titleLocked: { color: colors.textSecondary },
  sub: { marginTop: 3, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 20 },
  subLocked: { color: colors.slate400 },
})

export default memo(StepShell)
