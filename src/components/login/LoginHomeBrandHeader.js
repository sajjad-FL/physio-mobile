import { memo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { loginTokens as t, loginType, loginLeading } from '../../theme/loginTokens'
import { font, type } from '../../theme/typography'

function LoginHomeBrandHeader({ backLabel = 'Home', onBack }) {
  const insets = useSafeAreaInsets()

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
        <View style={styles.centerAbs} pointerEvents="none" accessibilityRole="header" accessibilityLabel="PhysiOkhom">
          <View style={styles.brandRow}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Text numberOfLines={1}>
              <Text style={styles.brandPhysio}>Physi</Text>
              <Text style={styles.brandKhom}>Okhom</Text>
            </Text>
          </View>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoMark: {
    width: 36,
    height: 36,
  },
  brandPhysio: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  brandKhom: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: t.brandAccent || '#0d9488',
    letterSpacing: -0.3,
  },
})

export default memo(LoginHomeBrandHeader)
