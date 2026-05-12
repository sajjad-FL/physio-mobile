import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

function SignupBrandHeader({ onBack }) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.side}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View style={styles.backIcon}>
            <Ionicons name="chevron-back" size={15} color={colors.white} />
          </View>
        </Pressable>
        <View style={styles.centerSlot} pointerEvents="none">
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Ionicons name="pulse" size={11} color={colors.white} />
            </View>
            <Text style={styles.brandPhysio}>Physio</Text>
            <Text style={styles.brandKhom}>Khom</Text>
          </View>
        </View>
        <View style={styles.side} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  side: { width: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand, letterSpacing: -0.3 },
})

export default memo(SignupBrandHeader)
