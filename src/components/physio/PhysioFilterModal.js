import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { DEFAULT_PHYSIO_FILTERS } from '../../constants/physioBookingFilters'

const STATUS_ROW = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'rescheduled', label: 'Rescheduled' },
]
const SERVICE_ROW = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'home', label: 'Home' },
]
const DATE_ROW = [
  { value: 'all', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipOn : styles.chipOff]}>
      <Text style={[styles.chipTxt, active ? styles.chipTxtOn : null]}>{label}</Text>
    </Pressable>
  )
}

export default function PhysioFilterModal({ visible, draft, setDraft, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.h2}>Filters</Text>
        <Text style={styles.sub}>Status</Text>
        <View style={styles.row}>
          {STATUS_ROW.map((x) => (
            <Chip
              key={x.value}
              label={x.label}
              active={draft.status === x.value}
              onPress={() => setDraft((prev) => ({ ...prev, status: x.value }))}
            />
          ))}
        </View>
        <Text style={styles.sub}>Service</Text>
        <View style={styles.row}>
          {SERVICE_ROW.map((x) => (
            <Chip
              key={x.value}
              label={x.label}
              active={draft.service === x.value}
              onPress={() => setDraft((prev) => ({ ...prev, service: x.value }))}
            />
          ))}
        </View>
        <Text style={styles.sub}>When</Text>
        <View style={styles.row}>
          {DATE_ROW.map((x) => (
            <Chip
              key={x.value}
              label={x.label}
              active={draft.date === x.value}
              onPress={() => setDraft((prev) => ({ ...prev, date: x.value }))}
            />
          ))}
        </View>
        <View style={styles.footer}>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              setDraft({ ...DEFAULT_PHYSIO_FILTERS })
            }}
          >
            <Text style={styles.secondaryTxt}>Reset</Text>
          </Pressable>
          <Pressable style={styles.primary} onPress={onClose}>
            <Text style={styles.primaryTxt}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '12%',
    borderRadius: 18,
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  h2: { fontSize: 18, fontWeight: '700', color: colors.slate900, marginBottom: 12 },
  sub: { marginTop: 10, marginBottom: 8, fontSize: 12, fontWeight: '600', color: colors.slate500 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipOff: { backgroundColor: colors.slate50, borderColor: colors.borderSubtle },
  chipOn: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  chipTxtOn: { color: colors.white },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  secondary: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  secondaryTxt: { fontWeight: '600', color: colors.slate900 },
  primary: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  primaryTxt: { fontWeight: '700', color: colors.white },
})
