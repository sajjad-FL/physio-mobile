import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { getSessionMilestoneMessage, getSessionProgress } from '../../utils/sessionProgress'

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
          <Text style={styles.sub}>{Math.round(percent)}% of your plan</Text>
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
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  h3: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  big: { marginTop: 6, fontSize: 18, fontWeight: '800', color: colors.slate900 },
  sub: { marginTop: 4, fontSize: 13, color: colors.slate500 },
  donePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  doneTxt: { fontSize: 10, fontWeight: '800', color: colors.emerald900, textTransform: 'uppercase' },
  track: {
    marginTop: 16,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  msg: { marginTop: 12, fontSize: 13, color: colors.slate600, lineHeight: 18 },
})
