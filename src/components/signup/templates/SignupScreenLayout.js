import { memo } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import SignupAppHeader from '../atoms/SignupAppHeader'
import SignupBrandHeader from '../atoms/SignupBrandHeader'
import { signupTokens as t } from '../../../theme/signupTokens'
import { sp } from '../../../theme/spacing'

/**
 * @param {'signup' | 'brand'} headerMode signup: back + “Sign up”. brand: teal back + centered app name.
 */
function SignupScreenLayout({ headerMode = 'signup', title, onBack, children, footer }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {headerMode === 'brand' ? (
        <SignupBrandHeader onBack={onBack} />
      ) : (
        <SignupAppHeader title={title} onBack={onBack} />
      )}
      <ScrollView
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.canvas },
  pad: { paddingHorizontal: sp[5], paddingTop: sp[6], paddingBottom: sp[10] },
})

export default memo(SignupScreenLayout)
