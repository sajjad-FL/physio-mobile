import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'

export default function AppHeader({ title, onBack, right }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: Math.max(insets.top, 8) + 8,
          paddingBottom: 12,
        },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.leading}>
            <Text style={styles.back}>← {title || 'Back'}</Text>
          </Pressable>
        ) : (
          <Text style={styles.brand} numberOfLines={1}>
            PhysioKhom
          </Text>
        )}
        {right ? <View style={styles.trailing}>{right}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  leading: { flexShrink: 1, marginRight: 12 },
  trailing: { flexShrink: 0, alignItems: 'flex-end' },
  brand: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.slate900, letterSpacing: -0.3 },
  back: { fontSize: 15, fontWeight: '600', color: colors.slate900 },
})
