import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from '../../theme/colors'

export default function Input({ label, error, style, inputStyle, ...props }) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.slate500}
        style={[styles.input, error ? styles.inputErr : null, inputStyle]}
        {...props}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, fontSize: 14, fontWeight: '500', color: colors.slate700 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.slate900,
    backgroundColor: colors.white,
  },
  inputErr: {
    borderColor: colors.red500,
  },
  err: { marginTop: 6, fontSize: 12, color: colors.red600 },
})
