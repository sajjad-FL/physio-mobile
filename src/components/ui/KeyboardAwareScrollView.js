import { memo } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native'
import { useKeyboardAwareScroll } from '../../hooks/useKeyboardAwareScroll'

/**
 * ScrollView + keyboard listeners so inputs stay above the software keyboard.
 * Wrap screen content (optionally with a fixed header sibling outside this component).
 */
function KeyboardAwareScrollView({
  children,
  style,
  contentContainerStyle,
  extraBottomPadding,
  minBottomInset,
  iosHeaderOffset,
  scrollToEndOnShow,
  ...rest
}) {
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardAwareScroll({
    extraBottomPadding,
    minBottomInset,
    iosHeaderOffset,
    scrollToEndOnShow,
  })

  return (
    <KeyboardAvoidingView {...keyboardAvoidingViewProps} style={[{ flex: 1 }, style]}>
      <ScrollView
        {...scrollViewProps}
        {...rest}
        style={styles.scroll}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: padBottom }]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
})

export default memo(KeyboardAwareScrollView)
