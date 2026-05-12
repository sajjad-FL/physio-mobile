import { memo } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../theme/colors'

/**
 * Screen wrapper — provides safe-area padding, background colour,
 * and optional scroll + keyboard-avoid behaviour.
 *
 * Props:
 *   scroll     – wrap content in ScrollView (default true)
 *   padded     – add standard horizontal padding (default true)
 *   bg         – background colour override
 *   contentStyle – extra style for the ScrollView contentContainer
 *   style      – extra style for the root View
 */
function Screen({ children, scroll = true, padded = true, bg, contentStyle, style }) {
  const insets = useSafeAreaInsets()
  const rootStyle = [styles.root, bg ? { backgroundColor: bg } : null, style]

  const inner = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded, contentStyle]}>{children}</View>
  )

  return (
    <KeyboardAvoidingView style={rootStyle} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {inner}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  fill: { flex: 1 },
  padded: { paddingHorizontal: 16 },
})

export default memo(Screen)
