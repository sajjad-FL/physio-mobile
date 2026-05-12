import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'

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

  useEffect(() => { load() }, [load])

  async function setAvailabilityFromSwitch(next) {
    try {
      const res = await api.patch('/physio/availability', { availability: next })
      setAvailability(res.data.availability)
      Toast.show({ type: 'success', text1: next ? 'You are now online' : 'You are now offline' })
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
      Toast.show({ type: 'success', text1: 'Coverage location updated' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not update location' })
    } finally {
      setUpdatingLocation(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <View style={styles.root}>

      {/* ── Availability toggle card ──────────────── */}
      <View style={[styles.statusCard, availability ? styles.statusCardOnline : styles.statusCardOffline]}>
        <View style={styles.statusCardHeader}>
          <View style={[styles.statusDot, availability ? styles.statusDotOnline : styles.statusDotOffline]} />
          <Text style={[styles.statusTitle, availability ? styles.statusTitleOnline : styles.statusTitleOffline]}>
            {availability ? 'You are online' : 'You are offline'}
          </Text>
        </View>
        <Text style={[styles.statusDesc, availability ? styles.statusDescOnline : styles.statusDescOffline]}>
          {availability
            ? 'Patients can be matched to you for home visits.'
            : 'You will not receive new patient assignments.'}
        </Text>
        <View style={styles.statusToggleRow}>
          <Text style={[styles.statusToggleLabel, availability ? styles.statusToggleLabelOn : styles.statusToggleLabelOff]}>
            {availability ? 'Tap to go offline' : 'Tap to go online'}
          </Text>
          <Switch
            value={availability}
            onValueChange={setAvailabilityFromSwitch}
            trackColor={{ true: colors.brand, false: colors.slate300 }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* ── Location card ─────────────────────────── */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locationIconWrap}>
            <Ionicons name="location-outline" size={18} color={colors.brand} />
          </View>
          <View style={styles.locationHeaderText}>
            <Text style={styles.locationTitle}>Coverage location</Text>
            <Text style={styles.locationSub}>Your GPS pin for patient matching</Text>
          </View>
        </View>

        <View style={styles.locationBody}>
          {coords ? (
            <View style={styles.coordsRow}>
              <Ionicons name="navigate-outline" size={13} color={colors.slate400} />
              <Text style={styles.coordsTxt}>
                {Number(coords.lat).toFixed(5)}, {Number(coords.lng).toFixed(5)}
              </Text>
            </View>
          ) : (
            <View style={styles.coordsRow}>
              <Ionicons name="warning-outline" size={13} color={colors.warning} />
              <Text style={styles.coordsEmpty}>Location not set yet</Text>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.locationBtn, updatingLocation && styles.locationBtnBusy, pressed && styles.locationBtnPressed]}
          onPress={updateMyLocation}
          disabled={updatingLocation}
        >
          {updatingLocation ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Ionicons name="locate-outline" size={16} color={colors.brand} />
          )}
          <Text style={styles.locationBtnTxt}>
            {updatingLocation ? 'Updating…' : 'Update my location'}
          </Text>
        </Pressable>
      </View>

      {/* ── Info note ─────────────────────────────── */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={colors.slate400} />
        <Text style={styles.infoTxt}>
          Your location is used to match you with nearby patients. Update it whenever you change areas.
        </Text>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },

  // Status card
  statusCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  statusCardOnline: {
    backgroundColor: colors.teal50,
    borderColor: colors.brandSoft,
  },
  statusCardOffline: {
    backgroundColor: colors.slate100,
    borderColor: colors.slate200,
  },
  statusCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotOnline: { backgroundColor: colors.brand },
  statusDotOffline: { backgroundColor: colors.slate400 },
  statusTitle: { fontFamily: font.bold, fontSize: type['2xl'], letterSpacing: -0.3 },
  statusTitleOnline: { color: colors.teal800 },
  statusTitleOffline: { color: colors.slate700 },
  statusDesc: { fontFamily: font.regular, fontSize: type.sm, lineHeight: leading.sm },
  statusDescOnline: { color: colors.teal800 },
  statusDescOffline: { color: colors.slate500 },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statusToggleLabel: { fontFamily: font.medium, fontSize: type.sm },
  statusToggleLabelOn: { color: colors.teal800 },
  statusToggleLabelOff: { color: colors.slate500 },

  // Location card
  locationCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationHeaderText: { flex: 1 },
  locationTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  locationSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  locationBody: {
    paddingHorizontal: 4,
  },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordsTxt: { fontFamily: font.regular, fontSize: type.sm, color: colors.slate600 },
  coordsEmpty: { fontFamily: font.regular, fontSize: type.sm, color: colors.warning },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  locationBtnBusy: { opacity: 0.7 },
  locationBtnPressed: { opacity: 0.75 },
  locationBtnTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },

  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  infoTxt: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textSecondary,
    lineHeight: leading.xs,
  },
})
