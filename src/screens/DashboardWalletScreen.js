import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { formatBookingDateAndSlot } from '../utils/date'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { colors } from '../theme/colors'

function formatInr(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}

export default function DashboardWalletScreen({ navigation }) {
  const [bookings, setBookings] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/bookings/my', { params: { page: 1, limit: 100 } })
      setBookings(res.data?.data || [])
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load bookings' })
      setBookings([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const { totalSpend, lines } = useMemo(() => {
    const list = bookings || []
    let sum = 0
    const rows = []
    for (const b of list) {
      const amt = Number(b.totalAmount) || 0
      const paid = b.paymentStatus === 'released' || b.paymentStatus === 'held' || b.paymentStatus === 'paid'
      if (paid && amt) {
        sum += amt
        rows.push({ b, amt })
      }
    }
    rows.sort((a, b) => String(b.b.createdAt || '').localeCompare(String(a.b.createdAt || '')))
    return { totalSpend: sum, lines: rows.slice(0, 12) }
  }, [bookings])

  if (bookings === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.sub}>Care spend from bookings where payment is secured or completed.</Text>
      <Card style={{ marginTop: 16 }}>
        <Text style={styles.kicker}>TOTAL CARE SPEND</Text>
        <Text style={styles.big}>{formatInr(totalSpend)}</Text>
      </Card>
      {lines.length > 0 ? (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.section}>Recent paid sessions</Text>
          {lines.map(({ b, amt }) => (
            <Card key={b._id} style={{ marginTop: 10 }}>
              <Text style={styles.rowTitle}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
              <Text style={styles.rowAmt}>{formatInr(amt)}</Text>
            </Card>
          ))}
        </View>
      ) : null}
      <View style={{ height: 16 }} />
      <Button title="Book a session" onPress={() => navigation.navigate('PhysioList')} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 6, fontSize: 14, color: colors.slate500, lineHeight: 20 },
  kicker: { fontSize: 11, fontWeight: '700', color: colors.slate500 },
  big: { marginTop: 8, fontSize: 30, fontWeight: '800', color: colors.slate900 },
  section: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.slate900 },
  rowAmt: { marginTop: 4, fontSize: 14, color: colors.slate600 },
})
