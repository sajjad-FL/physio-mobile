import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { formatBookingDateAndSlot } from '../utils/date'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

export default function UserBookingDetailScreen({ route }) {
  const { id } = route.params || {}
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get(`/bookings/${id}`)
      setB(res.data)
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to load' })
      setB(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  if (!b) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Booking not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Visit</Text>
      <Text style={styles.date}>{formatBookingDateAndSlot(b.date, b.timeSlot)}</Text>
      <Card style={{ marginTop: 16 }}>
        <Text style={styles.label}>Issue</Text>
        <Text style={styles.body}>{b.issue}</Text>
        <Text style={[styles.label, { marginTop: 12 }]}>Service</Text>
        <Text style={styles.body}>{b.serviceType}</Text>
        <Text style={[styles.label, { marginTop: 12 }]}>Physio</Text>
        <Text style={styles.body}>{typeof b.physioId === 'object' ? b.physioId?.name : '—'}</Text>
        {b.totalAmount != null ? (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>Total</Text>
            <Text style={styles.body}>₹{Number(b.totalAmount).toFixed(2)}</Text>
          </>
        ) : null}
      </Card>
      <Text style={[styles.muted, { marginTop: 16 }]}>
        Full session timeline, installments, and Razorpay actions match the web app — extend this screen with the same
        components as client/src/pages/dashboard/UserBookingDetailPage.jsx.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.slate50 },
  h1: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.slate500 },
  date: { marginTop: 6, fontSize: 22, fontWeight: '700', color: colors.slate900 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.slate500 },
  body: { marginTop: 4, fontSize: 15, color: colors.slate900, lineHeight: 22 },
  muted: { fontSize: 12, color: colors.slate500, lineHeight: 18 },
})
