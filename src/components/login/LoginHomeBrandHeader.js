import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { loginTokens as t, loginType, loginLeading } from '../../theme/loginTokens'
import { font } from '../../theme/typography'

function LoginHomeBrandHeader({ brandTitle = 'PhysioKhom', backLabel = 'Home', onBack }) {
  const insets = useSafeAreaInsets()
  const split = String(brandTitle || 'PhysioKhom').split(/(?=Khom)/i)
  const leftPart = split[0] || 'Physio'
  const rightPart = split.length > 1 ? split.slice(1).join('') : 'Khom'

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={`Go back to ${backLabel}`}
          >
            <Ionicons name="chevron-back" size={20} color={t.brandSolid} />
            <Text style={styles.homeTxt} numberOfLines={1}>
              {backLabel}
            </Text>
          </Pressable>
        </View>
        <View style={styles.centerAbs} pointerEvents="none">
          <Text style={styles.brandRow} numberOfLines={1}>
            <Text style={styles.brandPhysio}>{leftPart}</Text>
            <Text style={styles.brandKhom}>{rightPart}</Text>
          </Text>
        </View>
        <View style={styles.side} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: t.surface,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40, position: 'relative' },
  side: { width: 120, flexDirection: 'row', alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  homeTxt: {
    fontFamily: font.medium,
    fontSize: loginType.homeLink,
    lineHeight: loginLeading.homeLink,
    color: t.brandSolid,
  },
  centerAbs: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandPhysio: {
    fontFamily: font.bold,
    fontSize: loginType.brandTitle,
    lineHeight: loginLeading.brandTitle,
    color: t.ink,
    letterSpacing: -0.2,
  },
  brandKhom: {
    fontFamily: font.bold,
    fontSize: loginType.brandTitle,
    lineHeight: loginLeading.brandTitle,
    color: t.brandAccent,
    letterSpacing: -0.2,
  },
})

export default memo(LoginHomeBrandHeader)
