import { memo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function Chip({
  label,
  onPress,
  bg = colors.slate50,
  fg = colors.slate700,
  border = colors.borderSubtle,
  active = false,
  size = 'sm',
  style,
}) {
  const padStyle = size === 'md' ? styles.md : styles.sm
  const txtStyle = size === 'md' ? styles.txtMd : styles.txtSm

  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, padStyle, { backgroundColor: bg, borderColor: border }, active && styles.active, style]}
    >
      <Text style={[styles.txt, txtStyle, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, borderWidth: 1 },
  sm: { paddingHorizontal: 9, paddingVertical: 3 },
  md: { paddingHorizontal: 12, paddingVertical: 7 },
  txt: { fontFamily: font.bold },
  txtSm: { fontSize: type.xs },
  txtMd: { fontSize: type.sm },
  active: { opacity: 1 },
})

export default memo(Chip)
