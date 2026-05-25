import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'

function formatRupees(n) {
  const v = Number(n || 0)
  return `₹${v.toFixed(2)}`
}

function formatDt(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_LABEL = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  collected: 'Collected — pending verification',
  verified: 'Verified',
  rejected: 'Rejected',
  refunded: 'Refunded',
}

export default function InstallmentsPhysioCard({
  title,
  subtitle,
  summary,
  payments,
  emptyMessage,
  children,
}) {
  const s = summary || {}
  const totalAmount = Number(s.totalAmount || 0)
  const totalPaid = Number(s.totalPaid || 0)
  const totalCollected = Number(s.totalCollected || 0)
  const effectivePaid = totalPaid + totalCollected
  const outstanding = Math.max(0, totalAmount - effectivePaid)
  const milestoneStatus = Array.isArray(s.milestoneStatus) ? s.milestoneStatus : null
  const paidPct = totalAmount > 0 ? effectivePaid / totalAmount : 0
  const nextMilestone = milestoneStatus ? milestoneStatus.find((m) => !m.met) : null
  const allMet = milestoneStatus ? milestoneStatus.every((m) => m.met) : false

  const rows = Array.isArray(payments)
    ? [...payments].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
    : []

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h2}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {children ? <View style={{ flexShrink: 0 }}>{children}</View> : null}
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.sumBox}>
          <Text style={styles.sumL}>Paid</Text>
          <Text style={styles.sumV}>
            {formatRupees(effectivePaid)}{' '}
            <Text style={styles.sumMuted}>of {formatRupees(totalAmount)}</Text>
          </Text>
        </View>
        <View style={styles.sumBox}>
          <Text style={styles.sumL}>Outstanding</Text>
          <Text style={styles.sumV}>{formatRupees(outstanding)}</Text>
        </View>
        <View style={[styles.sumBox, allMet && styles.sumBoxMet]}>
          <Text style={styles.sumL}>Next milestone</Text>
          {milestoneStatus ? (
            allMet ? (
              <Text style={[styles.sumV, styles.sumVMet]}>All met</Text>
            ) : (
              <Text style={styles.sumV}>
                Session {nextMilestone.bySession}{'\n'}
                <Text style={styles.sumMuted}>{Math.round(nextMilestone.requiredPct * 100)}% required</Text>
              </Text>
            )
          ) : (
            <Text style={styles.sumV}>
              {Math.round(paidPct * 100)}%
              <Text style={styles.sumMuted}> paid</Text>
            </Text>
          )}
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>{emptyMessage}</Text>
        </View>
      ) : (
        rows.map((p) => (
          <View key={p._id} style={styles.line}>
            <Text style={styles.lineWhen}>{formatDt(p.verifiedAt || p.collectedAt || p.createdAt)}</Text>
            {p.sessionOrdinal ? (
              <Text style={styles.lineSession}>Session {p.sessionOrdinal}</Text>
            ) : (
              <Text style={styles.lineSessionGeneral}>General</Text>
            )}
            <Text style={styles.lineMode}>{p.mode ? String(p.mode) : '—'}</Text>
            <Text style={styles.lineAmt}>{formatRupees(p.amount)}</Text>
            <Text style={styles.lineSt}>{STATUS_LABEL[p.status] || p.status}</Text>
            {p.status === 'rejected' && p.rejectReason ? (
              <Text style={styles.reject}>{p.rejectReason}</Text>
            ) : null}
            {p.note ? <Text style={styles.note}>{p.note}</Text> : null}
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    padding: 18,
  },
  headRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  h2: { fontSize: 15, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 6, fontSize: 12, color: colors.slate500, lineHeight: 17 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  sumBox: {
    flexGrow: 1,
    minWidth: '28%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
  },
  sumBoxMet: { borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },
  sumL: { fontSize: 10, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase' },
  sumV: { marginTop: 6, fontSize: 15, fontWeight: '700', color: colors.slate900 },
  sumVMet: { color: '#15803d' },
  sumMuted: { fontSize: 12, fontWeight: '400', color: colors.slate500 },
  empty: {
    marginTop: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  emptyTxt: { fontSize: 13, color: colors.slate500 },
  line: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  lineWhen: { fontSize: 13, fontWeight: '600', color: colors.slate900 },
  lineSession: { marginTop: 4, fontSize: 11, fontWeight: '700', color: colors.brand },
  lineSessionGeneral: { marginTop: 4, fontSize: 11, fontWeight: '600', color: colors.slate500 },
  lineMode: { marginTop: 4, fontSize: 12, color: colors.slate600, textTransform: 'capitalize' },
  lineAmt: { marginTop: 4, fontSize: 14, fontWeight: '700', color: colors.slate900 },
  lineSt: { marginTop: 6, fontSize: 12, fontWeight: '600', color: colors.slate700 },
  reject: { marginTop: 6, fontSize: 12, color: '#be123c' },
  note: { marginTop: 4, fontSize: 12, color: colors.slate500 },
})
