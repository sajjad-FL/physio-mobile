import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'
import { formatBookingDateAndSlot } from '../utils/date'

export default function PhysioNotesScreen() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({})
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/physio/bookings', { params: { page: 1, limit: 50 } })
      const list = res.data?.data || []
      setBookings(list)
      const initial = {}
      await Promise.all(
        list.map(async (b) => {
          try {
            const n = await api.get(`/notes/${b._id}`)
            initial[b._id] = {
              symptoms: n.data?.symptoms || '',
              diagnosis: n.data?.diagnosis || '',
              treatmentPlan: n.data?.treatmentPlan || '',
              notes: n.data?.notes || '',
            }
          } catch {
            initial[b._id] = { symptoms: '', diagnosis: '', treatmentPlan: '', notes: '' }
          }
        }),
      )
      setForms(initial)
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function setField(bookingId, key, value) {
    setForms((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [key]: value },
    }))
  }

  async function save(bookingId) {
    const f = forms[bookingId] || {}
    setBusyId(bookingId)
    try {
      await api.post('/notes', {
        bookingId,
        symptoms: f.symptoms || '',
        diagnosis: f.diagnosis || '',
        treatmentPlan: f.treatmentPlan || '',
        notes: f.notes || '',
      })
      Toast.show({ type: 'success', text1: 'Notes saved' })
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} style={styles.flex}>
      <Text style={styles.h1}>Clinical notes</Text>
      <Text style={styles.sub}>SOAP-style documentation per visit (same APIs as web).</Text>

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : bookings.length === 0 ? (
        <Text style={styles.muted}>No bookings to document.</Text>
      ) : (
        bookings.map((bk) => (
          <Card key={bk._id} style={{ marginTop: 14 }}>
            <View style={styles.cardHead}>
              <Text style={styles.date}>{formatBookingDateAndSlot(bk.date, bk.timeSlot)}</Text>
              <Text style={styles.patient}>{bk.userId?.name ?? '—'}</Text>
            </View>
            <Text style={styles.issue}>{bk.issue}</Text>
            {[
              { k: 'symptoms', label: 'Symptoms' },
              { k: 'diagnosis', label: 'Diagnosis' },
              { k: 'treatmentPlan', label: 'Treatment plan' },
              { k: 'notes', label: 'Notes' },
            ].map(({ k, label }) => (
              <View key={k} style={{ marginTop: 12 }}>
                <Text style={styles.lbl}>{label}</Text>
                <TextInput
                  style={styles.ta}
                  multiline
                  value={forms[bk._id]?.[k] ?? ''}
                  onChangeText={(t) => setField(bk._id, k, t)}
                  placeholderTextColor={colors.slate500}
                />
              </View>
            ))}
            <View style={{ marginTop: 14 }}>
              <Button title={busyId === bk._id ? 'Saving…' : 'Save notes'} onPress={() => save(bk._id)} loading={busyId === bk._id} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 8, fontSize: 14, color: colors.slate500, lineHeight: 20 },
  muted: { marginTop: 12, color: colors.slate500 },
  cardHead: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, paddingBottom: 10 },
  date: { fontSize: 15, fontWeight: '700', color: colors.slate900 },
  patient: { marginTop: 4, fontSize: 12, fontWeight: '600', color: colors.slate500 },
  issue: { marginTop: 10, fontSize: 14, color: colors.slate600 },
  lbl: { fontSize: 11, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase' },
  ta: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 10,
    minHeight: 64,
    textAlignVertical: 'top',
    fontSize: 14,
    backgroundColor: colors.white,
  },
})
