import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import KeyboardAwareScrollView from '../components/ui/KeyboardAwareScrollView'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { formatBookingDateAndSlot } from '../utils/date'

const FIELDS = [
  { k: 'symptoms', label: 'Symptoms', icon: 'thermometer-outline', placeholder: 'Describe presenting symptoms…' },
  { k: 'diagnosis', label: 'Diagnosis', icon: 'medkit-outline', placeholder: 'Clinical diagnosis…' },
  { k: 'treatmentPlan', label: 'Treatment plan', icon: 'list-outline', placeholder: 'Exercises, modalities, goals…' },
  { k: 'notes', label: 'Notes', icon: 'create-outline', placeholder: 'Any other notes…' },
]

export default function PhysioNotesScreen() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/physio/bookings', { params: { page: 1, limit: 100 } })
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
      if (list.length > 0) setExpandedId(list[0]._id)
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function setField(bookingId, key, value) {
    setForms((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], [key]: value } }))
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="document-text-outline" size={32} color={colors.slate300} />
        </View>
        <Text style={styles.emptyTitle}>No bookings to document</Text>
        <Text style={styles.emptySub}>Clinical notes will appear here once you have assigned bookings.</Text>
      </View>
    )
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scroll}
      style={styles.root}
      iosHeaderOffset={0}
      extraBottomPadding={44}
    >
      {bookings.map((bk) => {
        const isExpanded = expandedId === bk._id
        const f = forms[bk._id] || {}
        const hasNotes = FIELDS.some(({ k }) => Boolean(f[k]))

        return (
          <View key={bk._id} style={styles.card}>
            {/* Card header — tap to expand/collapse */}
            <Pressable
              style={({ pressed }) => [styles.cardHeader, pressed && styles.cardHeaderPressed]}
              onPress={() => setExpandedId(isExpanded ? null : bk._id)}
            >
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardAvatar, hasNotes && styles.cardAvatarFilled]}>
                  <Ionicons
                    name={hasNotes ? 'document-text' : 'document-text-outline'}
                    size={15}
                    color={hasNotes ? colors.brand : colors.slate400}
                  />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardDate}>{formatBookingDateAndSlot(bk.date, bk.timeSlot)}</Text>
                  <Text style={styles.cardPatient} numberOfLines={1}>
                    {bk.userId?.name ?? '—'}
                    {bk.issue ? <Text style={styles.cardIssue}> · {bk.issue}</Text> : null}
                  </Text>
                </View>
              </View>
              <View style={styles.cardHeaderRight}>
                {hasNotes && (
                  <View style={styles.savedDot} />
                )}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.slate400}
                />
              </View>
            </Pressable>

            {/* Form fields — only visible when expanded */}
            {isExpanded && (
              <View style={styles.formBody}>
                <View style={styles.formDivider} />
                {FIELDS.map(({ k, label, icon, placeholder }) => (
                  <View key={k} style={styles.fieldWrap}>
                    <View style={styles.fieldLabel}>
                      <Ionicons name={icon} size={13} color={colors.slate400} />
                      <Text style={styles.fieldLabelTxt}>{label}</Text>
                    </View>
                    <TextInput
                      style={styles.textarea}
                      multiline
                      value={f[k] ?? ''}
                      onChangeText={(v) => setField(bk._id, k, v)}
                      placeholder={placeholder}
                      placeholderTextColor={colors.slate300}
                      textAlignVertical="top"
                    />
                  </View>
                ))}

                <Pressable
                  style={({ pressed }) => [styles.saveBtn, busyId === bk._id && styles.saveBtnBusy, pressed && styles.saveBtnPressed]}
                  onPress={() => save(bk._id)}
                  disabled={busyId === bk._id}
                >
                  {busyId === bk._id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
                  )}
                  <Text style={styles.saveBtnTxt}>
                    {busyId === bk._id ? 'Saving…' : 'Save notes'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )
      })}
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },

  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, backgroundColor: colors.canvas },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textTertiary, textAlign: 'center', lineHeight: leading.sm },

  // Card
  card: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 10,
  },
  cardHeaderPressed: { backgroundColor: colors.slate50 },
  cardHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, minWidth: 0 },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardAvatarFilled: { backgroundColor: colors.teal50 },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardDate: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  cardPatient: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  cardIssue: { color: colors.textTertiary },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  savedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },

  // Form
  formDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginHorizontal: 14 },
  formBody: { paddingBottom: 16 },
  fieldWrap: { paddingHorizontal: 14, paddingTop: 14, gap: 7 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabelTxt: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    padding: 12,
    minHeight: 72,
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
    lineHeight: leading.sm,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnBusy: { opacity: 0.7 },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.white },
})
