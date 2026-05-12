import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

/**
 * Horizontal flex row with optional gap, alignment helpers, and wrap support.
 * Props: gap, align, justify, wrap, style
 */
function Row({ children, gap = 8, align = 'center', justify = 'flex-start', wrap = false, style }) {
  return (
    <View
      style={[
        styles.row,
        { gap, alignItems: align, justifyContent: justify },
        wrap && styles.wrap,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  wrap: { flexWrap: 'wrap' },
})

export default memo(Row)
