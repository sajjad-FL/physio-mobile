import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const KEYBOARD_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
const KEYBOARD_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

/** Matches SignupAppHeader / AppHeader row (~36px) + safe top + vertical padding. */
export function iosHeaderKeyboardOffset(insets) {
  return Math.max(insets.top, 8) + 6 + 12 + 36
}

/**
 * Keeps focused inputs visible when the software keyboard opens (signup-style).
 * Adds keyboard height to ScrollView bottom padding and optionally scrolls to end.
 */
export function useKeyboardAwareScroll({
  extraBottomPadding = 28,
  minBottomInset = 20,
  iosHeaderOffset,
  scrollToEndOnShow = true,
} = {}) {
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
    const onShow = (e) => {
      const h = e?.endCoordinates?.height ?? 0
      setKeyboardHeight(h)
      if (scrollToEndOnShow) {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(scrollBottomIntoView, Platform.OS === 'ios' ? 120 : 80)
      }
    }
    const onHide = () => setKeyboardHeight(0)

    const showSub = Keyboard.addListener(KEYBOARD_SHOW, onShow)
    const hideSub = Keyboard.addListener(KEYBOARD_HIDE, onHide)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      showSub.remove()
      hideSub.remove()
    }
  }, [scrollBottomIntoView, scrollToEndOnShow])

  const basePadBottom = Math.max(insets.bottom, minBottomInset) + extraBottomPadding
  const padBottom = basePadBottom + keyboardHeight
  const keyboardVerticalOffset =
    Platform.OS === 'ios' ? (iosHeaderOffset ?? iosHeaderKeyboardOffset(insets)) : 0

  const scrollViewProps = {
    ref: scrollRef,
    keyboardShouldPersistTaps: 'handled',
    keyboardDismissMode: 'on-drag',
    showsVerticalScrollIndicator: false,
    automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
  }

  const keyboardAvoidingViewProps = {
    style: { flex: 1 },
    behavior: Platform.OS === 'ios' ? 'padding' : undefined,
    keyboardVerticalOffset,
  }

  return {
    scrollRef,
    padBottom,
    keyboardHeight,
    keyboardVerticalOffset,
    scrollViewProps,
    keyboardAvoidingViewProps,
  }
}
