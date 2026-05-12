import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../../theme/colors'
import { font, type } from '../../../theme/typography'

function SignupAppHeader({ title, onBack }) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View style={styles.backIcon}>
            <Ionicons name="chevron-back" size={15} color={colors.white} />
          </View>
          {title ? (
            <Text style={styles.backTxt} numberOfLines={1}>{title}</Text>
          ) : null}
        </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
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
    flexShrink: 0,
  },
  backTxt: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.textPrimary,
    flexShrink: 1,
  },
})

export default memo(SignupAppHeader)
