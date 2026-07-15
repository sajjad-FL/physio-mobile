import { memo, useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'
import { r } from '../../theme/radius'

/** Base pulsing block — use for custom layouts. */
export const Skeleton = memo(function Skeleton({ style, height = 12, width = '100%', radius = r.sm }) {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          opacity,
          height,
          width,
          borderRadius: radius,
          backgroundColor: colors.slate300,
        },
        style,
      ]}
    />
  )
})

export const ListSkeleton = memo(function ListSkeleton({ count = 5 }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.listCard}>
          <View style={styles.listMain}>
            <Skeleton height={12} width="42%" />
            <Skeleton height={10} width="58%" style={{ marginTop: 8 }} />
            <Skeleton height={9} width="32%" style={{ marginTop: 8 }} />
          </View>
          <View style={styles.listAside}>
            <Skeleton height={28} width={56} radius={r.md} />
            <Skeleton height={18} width={72} radius={r.full} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  )
})

export const DetailSkeleton = memo(function DetailSkeleton() {
  return (
    <View style={styles.detail} accessibilityLabel="Loading">
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={16} width="40%" />
            <Skeleton height={12} width="60%" />
            <Skeleton height={10} width="30%" />
          </View>
          <Skeleton height={28} width={80} radius={r.full} />
        </View>
        <View style={styles.chipRow}>
          <Skeleton height={26} width={72} radius={r.md} />
          <Skeleton height={26} width={88} radius={r.md} />
          <Skeleton height={26} width={64} radius={r.md} />
        </View>
      </View>
      <View style={styles.detailCard}>
        <Skeleton height={14} width="28%" />
        <Skeleton height={11} width="100%" style={{ marginTop: 12 }} />
        <Skeleton height={11} width="90%" style={{ marginTop: 8 }} />
        <Skeleton height={11} width="70%" style={{ marginTop: 8 }} />
        <View style={styles.detailGrid}>
          <Skeleton height={72} width="48%" radius={r.lg} />
          <Skeleton height={72} width="48%" radius={r.lg} />
        </View>
      </View>
      <View style={styles.detailCard}>
        <Skeleton height={14} width="36%" />
        <Skeleton height={100} width="100%" radius={r.lg} style={{ marginTop: 12 }} />
      </View>
    </View>
  )
})

export const CardSkeleton = memo(function CardSkeleton({ count = 4 }) {
  return (
    <View style={styles.grid} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton height={120} width="100%" radius={0} style={{ borderTopLeftRadius: r.lg, borderTopRightRadius: r.lg }} />
          <View style={styles.cardBody}>
            <Skeleton height={13} width="55%" />
            <Skeleton height={10} width="40%" style={{ marginTop: 8 }} />
            <View style={styles.cardFooter}>
              <Skeleton height={14} width={48} />
              <Skeleton height={28} width={64} radius={r.md} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
})

export const TableSkeleton = memo(function TableSkeleton({ rows = 6 }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.tableRow}>
          <Skeleton height={36} width={36} radius={r.full} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton height={12} width="45%" />
            <Skeleton height={9} width="55%" />
          </View>
          <Skeleton height={24} width={64} radius={r.full} />
        </View>
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  list: { gap: 8 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: r.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  listMain: { flex: 1 },
  listAside: { alignItems: 'flex-end' },
  detail: { gap: 12 },
  detailCard: {
    backgroundColor: colors.white || '#fff',
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  detailGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.white || '#fff',
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
  },
  cardBody: { padding: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: r.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
