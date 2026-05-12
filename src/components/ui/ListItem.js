import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

/**
 * Standard list row with optional leading icon/node, title, subtitle, trailing node, and chevron.
 * Props: title, subtitle, leading, trailing, chevron, onPress, style
 */
function ListItem({ title, subtitle, leading, trailing, chevron = false, onPress, style }) {
  const Wrap = onPress ? Pressable : View
  const wrapProps = onPress
    ? {
        onPress,
        style: ({ pressed }) => [styles.row, pressed && styles.pressed, style],
      }
    : { style: [styles.row, style] }

  return (
    <Wrap {...wrapProps}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.slate300} style={styles.chevron} />
      ) : null}
    </Wrap>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    gap: 10,
  },
  pressed: { opacity: 0.7 },
  leading: { flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 17 },
  trailing: { flexShrink: 0, alignItems: 'flex-end' },
  chevron: { flexShrink: 0, marginLeft: -4 },
})

export default memo(ListItem)
