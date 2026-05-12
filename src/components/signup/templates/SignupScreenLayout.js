import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SignupAppHeader from '../atoms/SignupAppHeader'
import { colors } from '../../../theme/colors'

const KEYBOARD_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
const KEYBOARD_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

function SignupScreenLayout({ backLabel = 'Home', onBack, children, footer }) {
  const insets = useSafeAreaInsets()
  const scrollRef = useRef(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const scrollBottomIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    })
  }, [])

  useEffect(() => {
    let timeoutId
    const showSub = Keyboard.addListener(KEYBOARD_SHOW, (e) => {
      const h = e?.endCoordinates?.height ?? 0
      setKeyboardHeight(h)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(scrollBottomIntoView, Platform.OS === 'ios' ? 120 : 80)
    })
    const hideSub = Keyboard.addListener(KEYBOARD_HIDE, () => {
      setKeyboardHeight(0)
    })
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      showSub.remove()
      hideSub.remove()
    }
  }, [scrollBottomIntoView])

  const basePadBottom = Math.max(insets.bottom, 20) + 28
  const padBottom = basePadBottom + keyboardHeight

  /** Header row is ~36px + safe top + padding — keeps iOS KAV from under-shifting. */
  const keyboardVerticalOffset = Platform.OS === 'ios' ? Math.max(insets.top, 8) + 6 + 12 + 36 : 0

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.bg}>
        <SignupAppHeader backLabel={backLabel} onBack={onBack} />
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: padBottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
