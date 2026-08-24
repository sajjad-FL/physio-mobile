import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
import {
  ESTIMATOR_MONTHLY_SESSION_OPTIONS,
  resolveEstimatorSessionFee,
} from '../utils/physioEarningsEstimate'

export default function EarningsEstimatorWidget({ sessionFee }) {
  const fee = resolveEstimatorSessionFee(sessionFee)
  const [sessions, setSessions] = useState(100)

  const monthlyGross = fee * sessions
  const platformFee = Math.round(monthlyGross * 0.15)
  const netEarnings = monthlyGross - platformFee

  return (
    <View style={styles.estimatorCard}>
      <View style={styles.estimatorHeader}>
        <Ionicons name="trending-up" size={18} color={colors.brand} />
        <Text style={styles.estimatorTitle}>Earnings Estimator</Text>
      </View>
      <Text style={styles.estimatorHelp}>
        Select average monthly sessions to estimate your take-home payouts.
      </Text>
      <Text style={styles.estimatorRate}>
        Based on ₹{fee.toLocaleString('en-IN')}/session (set by admin)
      </Text>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>
          Sessions per month:{' '}
          <Text style={{ fontFamily: font.bold, color: colors.brand }}>{sessions}</Text>
        </Text>
        <View style={styles.sessionsSelector}>
          {ESTIMATOR_MONTHLY_SESSION_OPTIONS.map((val) => (
            <Pressable
              key={val}
              onPress={() => setSessions(val)}
              style={[styles.sessionPill, sessions === val && styles.sessionPillActive]}
            >
              <Text style={[styles.sessionPillText, sessions === val && styles.sessionPillTextActive]}>
                {val}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.estimatorDivider} />

      <View style={styles.estimatorStats}>
        <View style={styles.estStatCol}>
          <Text style={styles.estStatLabel}>Est. Monthly Gross</Text>
          <Text style={styles.estStatVal}>₹{monthlyGross.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.estStatCol}>
          <Text style={styles.estStatLabel}>Platform share (15%)</Text>
          <Text style={[styles.estStatVal, { color: colors.danger }]}>-₹{platformFee.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.estStatCol}>
          <Text style={styles.estStatLabel}>Net Payout</Text>
          <Text style={[styles.estStatVal, { color: colors.success, fontFamily: font.bold }]}>
            ₹{netEarnings.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  estimatorCard: {
    backgroundColor: colors.teal50,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    marginTop: 14,
  },
  estimatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  estimatorTitle: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.teal800,
  },
  estimatorHelp: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.slate500,
    lineHeight: 14,
  },
  estimatorRate: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.slate600,
    marginTop: 4,
    marginBottom: 10,
  },
  sliderRow: {
    marginBottom: 10,
  },
  sliderLabel: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.slate600,
    marginBottom: 6,
  },
  sessionsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionPill: {
    minWidth: '18%',
    flexGrow: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionPillActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  sessionPillText: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.slate600,
  },
  sessionPillTextActive: {
    color: colors.white,
  },
  estimatorDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    marginVertical: 10,
  },
  estimatorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estStatCol: {
    flex: 1,
  },
  estStatLabel: {
    fontFamily: font.medium,
    fontSize: 9,
    color: colors.slate500,
    textTransform: 'uppercase',
  },
  estStatVal: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.ink,
    marginTop: 2,
  },
})
