import FilterSheet from '../ui/FilterSheet'
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

export default function PhysioFilterModal({ visible, draft, setDraft, onClose }) {
  const sections = [
    {
      key: 'status',
      label: 'Status',
      options: STATUS_ROW.map((x) => ({
        ...x,
        active: draft.status === x.value,
        onPress: () => setDraft((prev) => ({ ...prev, status: x.value })),
      })),
    },
    {
      key: 'service',
      label: 'Service',
      options: SERVICE_ROW.map((x) => ({
        ...x,
        active: draft.service === x.value,
        onPress: () => setDraft((prev) => ({ ...prev, service: x.value })),
      })),
    },
    {
      key: 'date',
      label: 'When',
      options: DATE_ROW.map((x) => ({
        ...x,
        active: draft.date === x.value,
        onPress: () => setDraft((prev) => ({ ...prev, date: x.value })),
      })),
    },
  ]

  return (
    <FilterSheet
      visible={visible}
      title="Filters"
      sections={sections}
      onClose={onClose}
      onReset={() => setDraft({ ...DEFAULT_PHYSIO_FILTERS })}
    />
  )
}
