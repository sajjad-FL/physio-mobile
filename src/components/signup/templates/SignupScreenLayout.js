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
        {/* Ambient Top Background Halo Glow */}
        <View style={styles.ambientHeaderGlow} pointerEvents="none" />
        <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

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
  bg: { flex: 1, backgroundColor: colors.canvas, position: 'relative' },
  ambientHeaderGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(162, 240, 239, 0.15)',
    zIndex: 0,
  },
  ambientHeaderGlow2: {
    position: 'absolute',
    top: -50,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 107, 107, 0.04)',
    zIndex: 0,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 24, flexGrow: 1, zIndex: 2 },
})

export default memo(SignupScreenLayout)
