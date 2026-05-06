import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'
import { formatBookingTimeSlot } from '../utils/date'

function badgeFor(status) {
  if (status === 'open') return { bg: colors.amber50, fg: colors.amber950, border: colors.amber200 }
  if (status === 'under_review') return { bg: colors.blue50, fg: colors.blue700, border: '#bfdbfe' }
  if (status === 'resolved') return { bg: colors.emerald50, fg: colors.emerald900, border: '#a7f3d0' }
  return { bg: colors.slate50, fg: colors.slate600, border: colors.borderSubtle }
}

export default function PhysioDisputesScreen() {
  const [list, setList] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/disputes/my', { params: { page, limit: 8 } })
      setList(res.data?.data || [])
      setTotalPages(res.data?.totalPages || 1)
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load disputes' })
      setList([])
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const loading = list === null

  return (
    <ScrollView contentContainerStyle={styles.pad} style={styles.flex}>
      <Text style={styles.h1}>Disputes</Text>
      <Text style={styles.sub}>Cases linked to your assigned bookings.</Text>

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : list.length === 0 ? (
        <Text style={styles.muted}>No disputes.</Text>
      ) : (
        list.map((d) => {
          const b = d.bookingId
          const st = badgeFor(d.status)
          return (
            <Card key={d._id} style={{ marginTop: 14 }}>
              <View style={styles.headRow}>
                <Text style={styles.reason}>{d.reason}</Text>
                <View style={[styles.statusPill, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <Text style={[styles.statusTxt, { color: st.fg }]}>{String(d.status || '').replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {b?.date} {formatBookingTimeSlot(b?.timeSlot)} · {b?.userId?.name} ·{' '}
                {d.raisedBy === 'physio' ? 'You raised' : 'Patient raised'}
              </Text>
              <Text style={styles.desc}>{d.description}</Text>
              {d.resolution ? (
                <View style={styles.resBox}>
                  <Text style={styles.resTitle}>Resolution</Text>
                  <Text style={styles.resBody}>{d.resolution}</Text>
                </View>
              ) : null}
            </Card>
          )
        })
      )}
      {totalPages > 1 ? (
        <View style={styles.pager}>
          <Button title="Prev" variant="outline" disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} />
          <Text style={styles.muted}>
            {page} / {totalPages}
          </Text>
          <Button title="Next" variant="outline" disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} />
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 6, fontSize: 14, color: colors.slate500 },
  muted: { marginTop: 12, color: colors.slate500 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  reason: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.slate900 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  statusTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  meta: { marginTop: 8, fontSize: 13, color: colors.slate500 },
  desc: { marginTop: 12, fontSize: 14, color: colors.slate800, lineHeight: 20 },
  resBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.borderSubtle },
  resTitle: { fontWeight: '700', color: colors.slate900 },
  resBody: { marginTop: 6, fontSize: 13, color: colors.slate600 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
})
