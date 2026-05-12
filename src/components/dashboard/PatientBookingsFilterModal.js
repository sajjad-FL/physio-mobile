import { useMemo, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import FilterSheet from '../ui/FilterSheet'
import { colors } from '../../theme/colors'
import { PATIENT_FILTER_LABELS } from '../../utils/patientBookingFilters'

const FILTERS = ['all', 'today', 'upcoming', 'past', 'range']

export default function PatientBookingsFilterModal({
  visible,
  filter,
  dateRange,
  onFilterChange,
  onClose,
}) {
  const [pickerField, setPickerField] = useState(null)

  const pickerDate = useMemo(() => {
    const raw = pickerField ? dateRange?.[pickerField] : ''
    const d = raw ? new Date(raw) : new Date()
    return Number.isNaN(d.getTime()) ? new Date() : d
  }, [dateRange, pickerField])

  const setPicked = (field, pickedDate) => {
    const y = pickedDate.getFullYear()
    const m = String(pickedDate.getMonth() + 1).padStart(2, '0')
    const d = String(pickedDate.getDate()).padStart(2, '0')
    onFilterChange('range', { ...dateRange, [field]: `${y}-${m}-${d}` })
  }

  const sections = [
    {
      key: 'patient-filter',
      label: 'Filter',
      options: FILTERS.map((k) => ({
        value: k,
        label: PATIENT_FILTER_LABELS[k],
        active: filter === k,
        onPress: () => onFilterChange(k, dateRange),
      })),
    },
  ]

  return (
    <FilterSheet
      visible={visible}
      title="Filters"
      subtitle="Show all, today, upcoming, past, or specific date range."
      sections={sections}
      onClose={onClose}
    >
      {filter === 'range' ? (
        <View style={styles.rangeWrap}>
          <Text style={styles.lbl}>Start date</Text>
          <Pressable style={styles.inputBtn} onPress={() => setPickerField('start')}>
            <Text style={styles.inputBtnTxt}>{dateRange?.start || 'Select start date...'}</Text>
          </Pressable>
          <Text style={[styles.lbl, { marginTop: 10 }]}>End date</Text>
          <Pressable style={styles.inputBtn} onPress={() => setPickerField('end')}>
            <Text style={styles.inputBtnTxt}>{dateRange?.end || 'Select end date...'}</Text>
          </Pressable>
          {pickerField && Platform.OS !== 'ios' ? (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="default"
              onChange={(ev, picked) => {
                setPickerField(null)
                if (ev.type === 'set' && picked) setPicked(pickerField, picked)
              }}
            />
          ) : null}
          {pickerField && Platform.OS === 'ios' ? (
            <View style={styles.iosWrap}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={(_, picked) => {
                  if (picked) setPicked(pickerField, picked)
                }}
              />
              <Pressable style={styles.doneBtn} onPress={() => setPickerField(null)}>
                <Text style={styles.doneTxt}>Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </FilterSheet>
  )
}

const styles = StyleSheet.create({
  rangeWrap: { marginTop: 14 },
  lbl: { fontSize: 12, fontWeight: '600', color: colors.slate700, marginBottom: 6 },
  inputBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.slate50,
  },
  inputBtnTxt: { color: colors.slate900, fontSize: 14, fontVariant: ['tabular-nums'] },
  iosWrap: { marginTop: 8, gap: 8 },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  doneTxt: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
})

