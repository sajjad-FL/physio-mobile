import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { colors } from '../theme/colors'

export default function PhysioAvailabilityScreen() {
  const [availability, setAvailability] = useState(true)
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingLocation, setUpdatingLocation] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/physio/me')
      if (typeof res.data?.availability === 'boolean') setAvailability(res.data.availability)
      if (res.data?.coordinates?.lat != null && res.data?.coordinates?.lng != null) {
        setCoords({ lat: res.data.coordinates.lat, lng: res.data.coordinates.lng })
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load profile' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function setAvailabilityFromSwitch(next) {
    try {
      const res = await api.patch('/physio/availability', { availability: next })
      setAvailability(res.data.availability)
      Toast.show({ type: 'success', text1: 'Availability updated' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Update failed' })
    }
  }

  async function updateMyLocation() {
    setUpdatingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      const lat = Number(pos.coords.latitude)
      const lng = Number(pos.coords.longitude)
      const res = await api.patch('/physio/location', { lat, lng })
      setCoords(res.data?.coordinates || { lat, lng })
      Toast.show({ type: 'success', text1: 'Location updated' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not update location' })
    } finally {
      setUpdatingLocation(false)
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Text style={styles.h1}>Availability</Text>
        <Text style={styles.sub}>Turn off when you&apos;re not accepting new assignments.</Text>
      </View>
      <Card style={styles.card}>
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold}>{availability ? 'You are online' : 'You are offline'}</Text>
              <Text style={styles.hint}>
                {availability ? 'Patients can be matched to you.' : 'You will not receive new matches.'}
              </Text>
            </View>
            <Switch value={availability} onValueChange={setAvailabilityFromSwitch} trackColor={{ true: colors.brand }} />
          </View>
        )}
        {!loading && (
          <>
            <View style={styles.sep} />
            <Text style={styles.coords}>
              Current coordinates: {coords ? `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}` : 'not set'}
            </Text>
            <Button
              title={updatingLocation ? 'Updating…' : 'Update My Location'}
              variant="outline"
              style={{ marginTop: 12 }}
              onPress={updateMyLocation}
              disabled={updatingLocation}
              loading={updatingLocation}
            />
          </>
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50, padding: 16 },
  head: { marginBottom: 16 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 6, fontSize: 14, color: colors.slate500, lineHeight: 20 },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bold: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  hint: { marginTop: 6, fontSize: 14, color: colors.slate500 },
  sep: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: 16 },
  coords: { fontSize: 12, color: colors.slate500 },
})
