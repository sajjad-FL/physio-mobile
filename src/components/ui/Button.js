import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../../theme/colors'

export default function Button({ title, onPress, disabled, loading, variant = 'primary', style }) {
  const isPrimary = variant === 'primary'
  const isOutline = variant === 'outline'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.brand} />
      ) : (
        <Text style={[styles.text, isPrimary && styles.textPrimary, isOutline && styles.textOutline]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.92 },
  text: { fontSize: 15, fontWeight: '600' },
  textPrimary: { color: colors.white },
  textOutline: { color: colors.slate900 },
})
