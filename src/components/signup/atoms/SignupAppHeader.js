import { memo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

/** Same chrome as LoginScreen header: Home-style back + centered brand. */
function SignupAppHeader({ onBack, backLabel = 'Home' }) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={backLabel === 'Home' ? 'Go back to Home' : 'Go back'}
        >
          <Ionicons name="chevron-back" size={16} color={colors.brand} />
          <Text style={styles.backTxt}>{backLabel}</Text>
        </Pressable>
        <View style={styles.brandRow}>
          <Image
            source={require('../../../../assets/images/logo.png')}
            style={styles.logoMark}
            resizeMode="contain"
          />
          <Text numberOfLines={1}>
            <Text style={styles.brandPhysio}>PhysiO</Text>
            <Text style={styles.brandKhom}>khom</Text>
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  backTxt: { fontFamily: font.medium, fontSize: type.base, color: colors.brand },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logoMark: {
    width: 34,
    height: 34,
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand, letterSpacing: -0.3 },
  headerSpacer: { minWidth: 80 },
})

export default memo(SignupAppHeader)
