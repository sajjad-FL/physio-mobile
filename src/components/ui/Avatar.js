import { memo } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font } from '../../theme/typography'

const SIZE = { sm: 32, md: 44, lg: 56, xl: 80 }
const FONT = { sm: 13, md: 17, lg: 22, xl: 32 }

/**
 * Circular avatar with image or monogram fallback.
 * Props: uri, name, size ('sm'|'md'|'lg'|'xl'|number), bg, style
 */
function Avatar({ uri, name, size = 'md', bg, style }) {
  const dim = typeof size === 'number' ? size : (SIZE[size] ?? 44)
  const fontSize = typeof size === 'number' ? Math.round(dim * 0.38) : (FONT[size] ?? 17)
  const initials = String(name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <View
      style={[
        styles.wrap,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg ?? colors.brandSoft },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.img} resizeMode="cover" />
      ) : (
        <Text style={[styles.monogram, { fontSize }]}>{initials}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
  monogram: { fontFamily: font.bold, color: colors.teal800 },
})

export default memo(Avatar)
