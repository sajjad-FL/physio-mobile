import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { getSessionMilestoneMessage, getSessionProgress } from '../../utils/sessionProgress'

const cardSurface = Platform.select({
  web: {
    backgroundColor: '#ffffff',
    boxShadow: '0px 2px 10px rgba(15, 23, 42, 0.08)',
  },
  default: {
    backgroundColor: colors.white,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
})

export default function SessionProgressPhysio({ booking }) {
  const { completed, total, percent, tier, isComplete } = getSessionProgress(booking)
  const message = getSessionMilestoneMessage(percent, isComplete)
  const colorsMap = getProgressTierColors(tier)

  const [barPct, setBarPct] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarPct(percent))
    return () => cancelAnimationFrame(id)
  }, [percent])

  const label = `${completed} of ${total} session${total === 1 ? '' : 's'} completed`

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.h3}>Session progress</Text>
          <Text style={styles.big}>{label}</Text>
          <Text style={styles.sub}>{Math.round(percent)}% of the care plan</Text>
        </View>
        {isComplete ? (
          <View style={styles.donePill}>
            <Text style={styles.doneTxt}>Complete</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: colorsMap.trackBg, borderColor: colorsMap.trackBorder }]}>
        <View style={[styles.fill, { width: `${barPct}%`, backgroundColor: colorsMap.fill }]} />
      </View>
      <Text style={styles.msg}>{message}</Text>
    </View>
  )
}

function getProgressTierColors(tier) {
  if (tier === 'green') return { trackBg: '#d1fae5', trackBorder: '#a7f3d0', fill: '#10b981' }
  if (tier === 'yellow') return { trackBg: '#fef3c7', trackBorder: '#fde68a', fill: '#f59e0b' }
  return { trackBg: '#fee2e2', trackBorder: '#fecaca', fill: '#ef4444' }
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  h3: { fontFamily: font.bold, fontSize: type.xs, color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.7 },
  big: { marginTop: 4, fontFamily: font.bold, fontSize: type.md, color: colors.slate900 },
  sub: { marginTop: 2, fontFamily: font.medium, fontSize: type.xs, color: colors.slate500 },
  donePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  doneTxt: { fontFamily: font.bold, fontSize: 9, color: colors.emerald900, textTransform: 'uppercase' },
  track: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  msg: { marginTop: 8, fontFamily: font.regular, fontSize: type.xs, color: colors.slate500, lineHeight: 14 },
})
