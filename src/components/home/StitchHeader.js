import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

export const StitchHeader = memo(function StitchHeader({ token, onSignIn, onDashboard }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.row}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Ionicons name="pulse" size={13} color={colors.white} />
          </View>
          <Text style={styles.brandPhysio}>Physio</Text>
          <Text style={styles.brandKhom}>Khom</Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoMark: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand, letterSpacing: -0.3 },
  dashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
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
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
  },
  signInTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
})
