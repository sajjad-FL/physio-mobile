import { memo } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native'
import { useKeyboardAwareScroll } from '../../hooks/useKeyboardAwareScroll'
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
 *   iosHeaderOffset – iOS KeyboardAvoidingView offset when a fixed header sits above scroll
 */
function Screen({
  children,
  scroll = true,
  padded = true,
  bg,
  contentStyle,
  style,
  iosHeaderOffset,
}) {
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardAwareScroll({
    extraBottomPadding: 24,
    minBottomInset: 16,
    iosHeaderOffset,
  })
  const rootStyle = [styles.root, bg ? { backgroundColor: bg } : null, style]

  const inner = scroll ? (
    <ScrollView
      {...scrollViewProps}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: padBottom },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded, contentStyle]}>{children}</View>
  )

  return (
    <KeyboardAvoidingView {...keyboardAvoidingViewProps} style={rootStyle}>
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
