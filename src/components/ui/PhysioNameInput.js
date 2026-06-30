import { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { PHYSIO_NAME_PREFIX, PHYSIO_NAME_SUFFIX, sanitizePhysioNameCore } from '../../utils/physioDisplayName'

/** Room for fixed Dr. / PT overlays inside the single TextInput padding. */
const PREFIX_PAD = 44
const SUFFIX_PAD = 36

/**
 * One TextInput only (avoids focus bugs from row layout + Pressable wrappers).
 * Parent state = editable middle name; Dr. and PT are visual only.
 */
const PhysioNameInput = forwardRef(function PhysioNameInput(
  {
    label = 'Full name',
    value,
    onChangeText,
    error,
    placeholder = 'Your name',
    style,
    returnKeyType = 'next',
    onSubmitEditing,
    blurOnSubmit,
    editable = true,
  },
  ref,
) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)

  useImperativeHandle(ref, () => inputRef.current)

  return (
    <View style={[styles.wrap, style]} collapsable={false}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[styles.fieldShell, focused && styles.fieldShellFocused, error ? styles.fieldShellErr : null]}
        collapsable={false}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(t) => onChangeText(sanitizePhysioNameCore(t))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          keyboardType="default"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          editable={editable}
          style={styles.input}
          accessibilityLabel={label}
        />
        <View pointerEvents="none" style={styles.overlayPrefixWrap}>
          <Text style={styles.overlayAffixText}>{PHYSIO_NAME_PREFIX}</Text>
        </View>
        <View pointerEvents="none" style={styles.overlaySuffixWrap}>
          <Text style={styles.overlayAffixText}>{PHYSIO_NAME_SUFFIX}</Text>
        </View>
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.slate700,
  },
  fieldShell: {
    position: 'relative',
    minHeight: 46,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    justifyContent: 'center',
  },
  fieldShellFocused: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  fieldShellErr: { borderColor: colors.danger },
  input: {
    minHeight: 46,
    paddingVertical: 10,
    paddingLeft: PREFIX_PAD,
    paddingRight: SUFFIX_PAD,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
  },
  overlayPrefixWrap: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  overlaySuffixWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  overlayAffixText: {
    fontFamily: font.semiBold,
    fontSize: type.base,
    color: colors.textSecondary,
  },
  err: { marginTop: 5, fontFamily: font.regular, fontSize: type.xs, color: colors.red600 },
})

export default memo(PhysioNameInput)
