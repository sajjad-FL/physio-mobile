import { memo } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native'
import SignupAppHeader from '../atoms/SignupAppHeader'
import { colors } from '../../../theme/colors'
import { useKeyboardAwareScroll } from '../../../hooks/useKeyboardAwareScroll'

function SignupScreenLayout({ backLabel = 'Home', onBack, children, footer }) {
  const { padBottom, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardAwareScroll()

  return (
    <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
      <View style={styles.bg}>
        <SignupAppHeader backLabel={backLabel} onBack={onBack} />
        <ScrollView
          {...scrollViewProps}
          contentContainerStyle={[styles.scroll, { paddingBottom: padBottom }]}
        >
          {children}
          {footer}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 24, flexGrow: 1 },
})

export default memo(SignupScreenLayout)
