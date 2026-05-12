import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatBookingTimeSlot } from '../../utils/date'
import { colors } from '../../theme/colors'
import { openGoogleMapsDestination } from '../../utils/googleMaps'
import { buildSessionDateSet, getSessionsForYmd, todayYmd, ymdFromDate } from '../../utils/physioBookingHelpers'

function startOfMonth(d) {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(12, 0, 0, 0)
  return x
}

function isoWeekdayMon0(date) {
  const wd = date.getDay()
  return wd === 0 ? 6 : wd - 1
}

/** @param {Date} monthStart first of month noon */
function calendarCells(monthStart) {
  const y = monthStart.getFullYear()
  const mo = monthStart.getMonth()
  const firstOfMonth = new Date(y, mo, 1)
  const padCount = isoWeekdayMon0(firstOfMonth)
  const lastDay = new Date(y, mo + 1, 0).getDate()
  const rows = []

  /** @type {({ key: string, date: Date } | null)[]} */
  let row = []
  for (let i = 0; i < padCount; i += 1) row.push(null)
  for (let day = 1; day <= lastDay; day += 1) {
    const dt = new Date(y, mo, day)
    dt.setHours(12, 0, 0, 0)
    row.push({
      key: `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      date: dt,
    })
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  if (row.length) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }
  return rows
}

const MONTH_LABEL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function SessionsCalendarRN({ displayBookings, onOpenBooking }) {
  const sessionDates = useMemo(() => buildSessionDateSet(displayBookings || []), [displayBookings])
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())

  const selectedYmd = ymdFromDate(selected)
  const daySessions = useMemo(() => getSessionsForYmd(displayBookings || [], selectedYmd), [displayBookings, selectedYmd])

  const grid = useMemo(() => calendarCells(cursor), [cursor])

  function prevMonth() {
    const d = startOfMonth(cursor)
    d.setMonth(d.getMonth() - 1)
    setCursor(d)
  }
  function nextMonth() {
    const d = startOfMonth(cursor)
    d.setMonth(d.getMonth() + 1)
    setCursor(d)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.monthBar}>
        <Pressable hitSlop={10} onPress={prevMonth} style={styles.monthBtn}>
          <Text style={styles.monthBtnTxt}>←</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTH_LABEL[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <Pressable hitSlop={10} onPress={nextMonth} style={styles.monthBtn}>
          <Text style={styles.monthBtnTxt}>→</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEK.map((w) => (
          <Text key={w} style={styles.weekCell}>
            {w}
          </Text>
        ))}
      </View>
      {grid.map((r, ri) => (
        // eslint-disable-next-line react/no-array-index-key
        <View style={styles.gridRow} key={`r-${ri}`}>
          {r.map((cell, ci) =>
            cell == null ? (
              // eslint-disable-next-line react/no-array-index-key
              <View key={`x-${ri}-${ci}`} style={[styles.dayCell, styles.dayEmpty]} />
            ) : (
              <Pressable
                key={cell.key}
                onPress={() => setSelected(cell.date)}
                style={[
                  styles.dayCell,
                  ymdFromDate(cell.date) === selectedYmd && styles.daySelected,
                  ymdFromDate(cell.date) === todayYmd() && styles.dayToday,
                ]}
              >
                <Text style={styles.dayNum}>{cell.date.getDate()}</Text>
                {sessionDates.has(ymdFromDate(cell.date)) ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
              </Pressable>
            ),
          )}
        </View>
      ))}

      <Text style={styles.dayHeading}>
        {selected.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Text>

      {daySessions.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayTxt}>No sessions this day.</Text>
        </View>
      ) : (
        daySessions.map(({ booking: b, row: r }) => {
          const canStart = Boolean(b.userId?.coordinates || String(b.userId?.location || '').trim())
          return (
            <Pressable key={`${b._id}-${r.key}`} style={styles.sessionRow} onPress={() => onOpenBooking(b)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTime}>{formatBookingTimeSlot(r.time)}</Text>
                <Text style={styles.sessionName}>{b.userId?.name ?? '—'}</Text>
              </View>
              <Pressable
                style={[styles.smallBtn, !canStart && styles.smallBtnDisabled]}
                disabled={!canStart}
                onPress={(e) => {
                  e?.stopPropagation?.()
                  openGoogleMapsDestination({
                    coordinates: b.userId?.coordinates,
                    address: b.userId?.location,
                  })
                }}
              >
                <Text style={styles.smallBtnTxt}>Start</Text>
              </Pressable>
              <Text style={styles.tealTxt}> ›</Text>
            </Pressable>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    padding: 12,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthBtn: { padding: 8 },
  monthBtnTxt: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.slate500 },
  gridRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    marginVertical: 3,
    marginHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayEmpty: { opacity: 0 },
  dayToday: { borderColor: colors.blue600 + '66' },
  daySelected: { backgroundColor: colors.brandSoft },
  dayNum: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  dot: { marginTop: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.brand },
  dotSpacer: { marginTop: 4, height: 5 },
  dayHeading: { marginTop: 16, fontSize: 15, fontWeight: '700', color: colors.slate900 },
  emptyDay: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 20,
    backgroundColor: colors.slate50,
  },
  emptyDayTxt: { textAlign: 'center', fontSize: 14, color: colors.slate500 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  sessionTime: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  sessionName: { marginTop: 2, fontSize: 13, color: colors.slate600 },
  smallBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: colors.blue50,
  },
  smallBtnDisabled: { opacity: 0.45 },
  smallBtnTxt: { fontSize: 11, fontWeight: '700', color: colors.blue700 },
  tealTxt: { fontSize: 16, color: colors.brand, fontWeight: '700' },
})

