import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { formatBookingDateAndSlot } from '../utils/date'
import { bookingStatusBadge, paymentBadge } from '../utils/dashboardUtils'
import { colors } from '../theme/colors'

export default function DashboardBookingsScreen({ navigation }) {
  const [rows, setRows] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/bookings/my', { params: { page: 1, limit: 100 } })
      setRows(res.data?.data || [])
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load bookings' })
      setRows([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (rows === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item._id)}
        refreshing={false}
        onRefresh={load}
        contentContainerStyle={rows.length === 0 ? styles.emptyPad : styles.listPad}
        ListEmptyComponent={<Text style={styles.muted}>No bookings yet.</Text>}
        renderItem={({ item }) => {
          const st = bookingStatusBadge(item.status, item.sessionStatus, item.paymentStatus)
          const pay = paymentBadge(item.paymentStatus)
          return (
            <Pressable style={styles.card} onPress={() => navigation.navigate('BookingDetail', { id: item._id })}>
              <Text style={styles.date}>{formatBookingDateAndSlot(item.date, item.timeSlot)}</Text>
              <Text style={styles.sub}>{item.physioId?.name || 'Physio TBD'}</Text>
              <View style={styles.row}>
                <View style={[styles.chip, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <Text style={[styles.chipText, { color: st.fg }]}>{st.label}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: pay.bg, borderColor: pay.border }]}>
                  <Text style={[styles.chipText, { color: pay.fg }]}>{pay.label}</Text>
                </View>
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { padding: 16, paddingBottom: 32, gap: 12 },
  emptyPad: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  date: { fontSize: 16, fontWeight: '600', color: colors.slate900 },
  sub: { marginTop: 4, fontSize: 14, color: colors.slate500 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '700' },
  muted: { textAlign: 'center', color: colors.slate500 },
})
