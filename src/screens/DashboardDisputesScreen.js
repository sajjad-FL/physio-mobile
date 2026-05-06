import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import { disputeStatusBadge } from '../utils/dashboardUtils'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

export default function DashboardDisputesScreen() {
  const [rows, setRows] = useState(null)
  const [page] = useState(1)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/disputes/my', { params: { page, limit: 20 } })
      setRows(res.data?.data || [])
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load disputes' })
      setRows([])
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  if (rows === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => String(item._id)}
      onRefresh={load}
      refreshing={false}
      contentContainerStyle={styles.pad}
      ListEmptyComponent={<Text style={styles.muted}>No disputes.</Text>}
      renderItem={({ item }) => {
        const chip = disputeStatusBadge(item.status)
        return (
          <Card style={{ marginBottom: 12 }}>
            <View style={[styles.chip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
              <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
            </View>
            <Text style={styles.body}>{item.description || item.reason || '—'}</Text>
          </Card>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '700' },
  body: { marginTop: 10, fontSize: 14, color: colors.slate800, lineHeight: 20 },
  muted: { textAlign: 'center', color: colors.slate500 },
})
