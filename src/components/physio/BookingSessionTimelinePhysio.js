import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { formatBookingDateAndSlot } from '../../utils/date'
import { normalizeSessionRows, todayYmd } from '../../utils/physioBookingHelpers'

function statusLabel(status) {
  if (status === 'completed') return 'Completed'
  if (status === 'no_show') return 'No-show'
  if (status === 'rescheduled') return 'Rescheduled'
  return 'Scheduled'
}

export default function BookingSessionTimelinePhysio({ booking, reschedule, physioActions }) {
  const rows = normalizeSessionRows(booking)
  const tday = todayYmd()
  const bookingRescheduled = Boolean(booking.rescheduled)

  return (
    <View style={[styles.wrap, bookingRescheduled ? styles.wrapResched : null]}>
      {rows.map((r) => {
        const rowStatus =
          r.status === 'completed' || r.status === 'no_show'
            ? r.status
            : bookingRescheduled && r.date !== tday
            ? 'rescheduled'
            : 'scheduled'
        const rowDone = r.status === 'completed'
        const rowNoShow = r.status === 'no_show'
        const showReschedule = Boolean(reschedule?.enabled && reschedule?.onReschedule && !rowDone && !rowNoShow)
        const busyKey = String(r.sessionId || r.key)
        const actBusy = String(physioActions?.busySessionId || '') === busyKey
        const isTodayOrPast = r.date <= tday
        const perRowReason =
          typeof physioActions?.rowBlockedReason === 'function' ? physioActions.rowBlockedReason(r) || '' : ''
        const blockedReason = !isTodayOrPast
          ? 'Available on the scheduled day'
          : perRowReason
          ? perRowReason
          : physioActions?.canAct === false
          ? physioActions?.blockedReason || 'Payment must be confirmed'
          : ''
        const canActOnRow = Boolean(physioActions?.enabled) && !rowDone && !rowNoShow && !blockedReason
        const showPhysioButtons = Boolean(physioActions?.enabled) && !rowDone && !rowNoShow

        let rowBg = colors.white
        let rowBorder = colors.borderSubtle
        if (rowDone) {
          rowBg = colors.emerald50
          rowBorder = '#a7f3d0'
        } else if (rowNoShow) {
          rowBg = colors.rose50
          rowBorder = '#fecdd3'
        } else if (r.date === tday) {
          rowBg = colors.blue50
          rowBorder = colors.blue600 + '55'
        }

        return (
          <View key={r.key} style={[styles.row, { backgroundColor: rowBg, borderColor: rowBorder }]}>
            <View style={styles.rowInner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowHead}>
                  #{r.n} · {formatBookingDateAndSlot(r.date, r.time)}
                  {rowDone ? <Text style={styles.tagDone}> Done</Text> : null}
                  {rowNoShow ? <Text style={styles.tagNs}> No-show</Text> : null}
                  {!rowDone && !rowNoShow && r.date === tday ? <Text style={styles.tagToday}> Today</Text> : null}
                  {!rowDone && !rowNoShow && Boolean(blockedReason && perRowReason) ? (
                    <Text style={styles.locked}> Locked</Text>
                  ) : null}
                </Text>
                {rowNoShow && r.noShowReason ? <Text style={styles.nsReason}>Reason: {r.noShowReason}</Text> : null}
                <View style={styles.btnRow}>
                  {showReschedule ? (
                    <Pressable style={styles.mini} onPress={() => reschedule.onReschedule(r)}>
                      <Text style={styles.miniTxt}>Reschedule</Text>
                    </Pressable>
                  ) : null}
                  {showPhysioButtons ? (
                    <Pressable
                      style={[styles.mini, styles.miniOk, (!canActOnRow || actBusy) && styles.disabled]}
                      disabled={!canActOnRow || actBusy}
                      onPress={() => (canActOnRow ? physioActions.onComplete(r) : null)}
                    >
                      <Text style={styles.miniTxt}>{actBusy ? '…' : 'Mark complete'}</Text>
                    </Pressable>
                  ) : null}
                  {showPhysioButtons && physioActions?.onNoShow && r.perSession ? (
                    <Pressable
                      style={[styles.mini, styles.miniWarn, (!canActOnRow || actBusy) && styles.disabled]}
                      disabled={!canActOnRow || actBusy}
                      onPress={() => (canActOnRow ? physioActions.onNoShow(r) : null)}
                    >
                      <Text style={styles.miniWarnTxt}>No-show</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!canActOnRow && showPhysioButtons && blockedReason ? (
                  <Text style={styles.blockHint}>{blockedReason}</Text>
                ) : null}
              </View>
              <View style={[styles.badge, { borderColor: rowBorder }]}>
                <Text style={styles.badgeTxt}>{statusLabel(rowStatus)}</Text>
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, overflow: 'hidden' },
  wrapResched: { borderColor: '#fde68a', backgroundColor: colors.amber50 + '99' },
  row: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, paddingHorizontal: 8, paddingVertical: 7 },
  rowInner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowHead: { fontSize: 12, fontWeight: '600', color: colors.slate900, flexWrap: 'wrap' },
  tagDone: { fontSize: 10, fontWeight: '700', color: colors.emerald900 },
  tagNs: { fontSize: 10, fontWeight: '700', color: '#9f1239' },
  tagToday: { fontSize: 10, fontWeight: '700', color: colors.blue700 },
  locked: { fontSize: 10, fontWeight: '700', color: colors.slate600 },
  nsReason: { marginTop: 5, fontSize: 11, color: '#9f1239' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  mini: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  miniOk: { borderColor: '#a7f3d0' },
  miniWarn: { borderColor: '#fecdd3', backgroundColor: colors.white },
  miniTxt: { fontSize: 10, fontWeight: '600', color: colors.slate800 },
  miniWarnTxt: { fontSize: 10, fontWeight: '600', color: '#9f1239' },
  disabled: { opacity: 0.45 },
  blockHint: { marginTop: 5, fontSize: 10, color: colors.slate500 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 10, fontWeight: '600', color: colors.slate700 },
})
