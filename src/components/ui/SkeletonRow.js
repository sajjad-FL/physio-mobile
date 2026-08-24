import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'
import { r } from '../../theme/radius'
import { Skeleton } from './skeletons'

/** Single pulsing list-row skeleton (legacy API). Prefer ListSkeleton for screens. */
function SkeletonRow({ lines = 1 }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Skeleton height={11} width="70%" />
        {lines > 1 ? <Skeleton height={9} width="45%" style={{ marginTop: 6 }} /> : null}
      </View>
      <View style={styles.rightGroup}>
        <Skeleton height={10} width={72} />
        {lines > 1 ? <Skeleton height={8} width={50} style={{ marginTop: 5 }} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    borderRadius: r.lg,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 12,
  },
  left: { flex: 1 },
  rightGroup: { alignItems: 'flex-end' },
})

export default memo(SkeletonRow)
