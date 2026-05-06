import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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

function isProfileIncompleteError(e) {
  return e?.response?.status === 403 && e?.response?.data?.code === 'PROFILE_INCOMPLETE'
}

export default function DashboardHomeScreen({ navigation }) {
  const [bookings, setBookings] = useState(null)
  const [disputes, setDisputes] = useState(null)
  const [firstName, setFirstName] = useState(null)
  const [needsProfile, setNeedsProfile] = useState(false)

  const load = useCallback(async () => {
    let bookingsList = []
    let disputesList = []
    let profileIncomplete = false
    let loadError = false

    try {
      const bRes = await api.get('/bookings/my', { params: { page: 1, limit: 40 } })
      bookingsList = bRes.data?.data || []
    } catch (e) {
      if (isProfileIncompleteError(e)) profileIncomplete = true
      else loadError = true
    }

    try {
      const dRes = await api.get('/disputes/my', { params: { page: 1, limit: 20 } })
      disputesList = dRes.data?.data || []
    } catch (e) {
      if (isProfileIncompleteError(e)) profileIncomplete = true
      else loadError = true
    }

    let pRes = null
    try {
      pRes = await api.get('/profile')
    } catch {
      /* profile is allowed without complete flag; ignore */
    }

    setBookings(bookingsList)
    setDisputes(disputesList)
    setNeedsProfile(profileIncomplete)
    const raw = pRes?.data?.name?.trim()
    setFirstName(raw ? raw.split(/\s+/)[0] : null)

    if (loadError && !profileIncomplete) {
      Toast.show({ type: 'error', text1: 'Could not load dashboard' })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loading = bookings === null || disputes === null
  const openDisputes = (disputes || []).filter((d) => d.status === 'open' || d.status === 'under_review').length

  const nextBooking = useMemo(() => {
    const list = bookings || []
    const pending = list.find((b) => b.sessionStatus !== 'completed')
    return pending || null
  }, [bookings])

  const revenueTotal = useMemo(() => {
    return (bookings || []).reduce((sum, b) => {
      const amt = Number(b.totalAmount) || 0
      if (!amt) return sum
      const paid = b.paymentStatus === 'released' || b.paymentStatus === 'held' || b.paymentStatus === 'paid'
      return paid ? sum + amt : sum
    }, 0)
  }, [bookings])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.kicker}>DASHBOARD</Text>
      <Text style={styles.h1}>{firstName ? `Hi, ${firstName}` : 'Your care'}</Text>
      {needsProfile ? (
        <View style={styles.profileBanner}>
          <Text style={styles.profileBannerTitle}>Complete your profile</Text>
          <Text style={styles.profileBannerText}>
            Your account is already created. Add date of birth, gender, and address in Profile to book sessions and load
            your bookings here.
          </Text>
          <View style={{ height: 12 }} />
          <Button title="Go to Profile" onPress={() => navigation.navigate('Profile')} />
        </View>
      ) : null}
      {openDisputes > 0 ? (
        <View style={styles.disputeBanner}>
          <Text style={styles.disputeText}>
            <Text style={{ fontWeight: '700' }}>{openDisputes}</Text> open dispute{openDisputes === 1 ? '' : 's'} —{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('Disputes')}>
            <Text style={styles.link}>Review</Text>
          </Pressable>
        </View>
      ) : null}
      <Card style={{ marginTop: 16 }}>
        <Text style={styles.kicker}>NEXT SESSION</Text>
        {nextBooking ? (
          <>
            <Text style={styles.bigTime}>{formatBookingDateAndSlot(nextBooking.date, nextBooking.timeSlot)}</Text>
            <Text style={styles.muted}>{nextBooking.physioId?.name || 'Physiotherapist TBD'}</Text>
            <View style={{ height: 12 }} />
            <Button
              title="View booking"
              variant="outline"
              onPress={() =>
                navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: nextBooking._id } })
              }
            />
          </>
        ) : (
          <Text style={styles.muted}>No upcoming sessions. Book when you are ready.</Text>
        )}
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Text style={styles.kicker}>CARE SPEND (SECURED)</Text>
        <Text style={styles.money}>{formatInr(revenueTotal)}</Text>
        <Text style={styles.muted}>Sum of booking totals with payment held or released.</Text>
      </Card>
      <View style={{ height: 12 }} />
      <Button title="Book a session" onPress={() => navigation.navigate('PhysioList')} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.slate50 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.slate500 },
  h1: { marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.slate900 },
  disputeBanner: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  disputeText: { fontSize: 14, color: '#78350f' },
  profileBanner: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.white,
  },
  profileBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.slate900 },
  profileBannerText: { marginTop: 6, fontSize: 13, color: colors.slate500, lineHeight: 18 },
  link: { fontSize: 14, fontWeight: '700', color: '#92400e', textDecorationLine: 'underline' },
  bigTime: { marginTop: 8, fontSize: 22, fontWeight: '700', color: colors.slate900 },
  muted: { marginTop: 6, fontSize: 13, color: colors.slate500 },
  money: { marginTop: 8, fontSize: 28, fontWeight: '800', color: colors.slate900 },
})
