import { memo, useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'
import { r } from '../../theme/radius'

function SkeletonRow({ lines = 1 }) {
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
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={styles.left} />
      <View style={styles.rightGroup}>
        <View style={styles.right} />
        {lines > 1 ? <View style={[styles.right, styles.rightSm]} /> : null}
      </View>
    </Animated.View>
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
  left: { flex: 1, height: 11, borderRadius: r.sm, backgroundColor: colors.slate300 },
  rightGroup: { alignItems: 'flex-end', gap: 5 },
  right: { width: 72, height: 10, borderRadius: r.sm, backgroundColor: colors.slate300 },
  rightSm: { width: 50, height: 8 },
})

export default memo(SkeletonRow)
