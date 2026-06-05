import { memo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'

function AppHeader({ title, onBack, right }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, 8) + 6 },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            <Text style={styles.backTxt} numberOfLines={1}>{title || 'Back'}</Text>
          </Pressable>
        ) : (
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Text numberOfLines={1}>
              <Text style={styles.brandPhysio}>PhysiO</Text>
              <Text style={styles.brandKhom}>khom</Text>
            </Text>
          </View>
        )}
        {right ? <View style={styles.trailing}>{right}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, marginRight: 12 },
  backTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary, flexShrink: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  logoMark: {
    width: 34,
    height: 34,
  },
  brandPhysio: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  brandKhom: { fontFamily: font.bold, fontSize: type.lg, color: colors.brand, letterSpacing: -0.3 },
  trailing: { flexShrink: 0, alignItems: 'flex-end' },
})

export default memo(AppHeader)
