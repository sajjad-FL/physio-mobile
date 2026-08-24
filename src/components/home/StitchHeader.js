import { memo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { figmaTokens, figmaShadowSm } from '../../theme/figmaTokens'

export const StitchHeader = memo(function StitchHeader({ token, onSignIn, onDashboard }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.row}>
        <View style={styles.brandRow} accessibilityRole="header" accessibilityLabel="PhysiOkhom">
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
        {token ? (
          <Pressable onPress={onDashboard} style={styles.dashBtn} hitSlop={8}>
            <Ionicons name="grid-outline" size={13} color={colors.white} />
            <Text style={styles.dashTxt}>Dashboard</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onSignIn} style={styles.signInBtn} hitSlop={12}>
            <Text style={styles.signInTxt}>Sign in</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.05)',
    ...figmaShadowSm,
    zIndex: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoMark: {
    width: 40,
    height: 40,
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: '#0f172a', letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: figmaTokens.primary, letterSpacing: -0.3 },
  dashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: figmaTokens.primary,
    shadowColor: figmaTokens.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  dashTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  signInBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 107, 0.15)',
    backgroundColor: figmaTokens.mintSoft,
  },
  signInTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: figmaTokens.primary },
})
