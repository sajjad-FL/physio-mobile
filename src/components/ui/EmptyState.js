import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from './Button'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function EmptyState({
  title,
  message,
  primaryCta,
  secondaryCta,
  bordered = false,
  style,
}) {
  return (
    <View style={[styles.wrap, bordered ? styles.bordered : null, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      {primaryCta || secondaryCta ? (
        <View style={styles.actions}>
          {secondaryCta ? (
            <Button title={secondaryCta.title} variant="outline" onPress={secondaryCta.onPress} />
          ) : null}
          {primaryCta ? <Button title={primaryCta.title} onPress={primaryCta.onPress} /> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  bordered: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    backgroundColor: colors.slate50,
    padding: 14,
  },
  title: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary, textAlign: 'center' },
  msg: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
})

export default memo(EmptyState)
