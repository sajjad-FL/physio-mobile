import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from './Button'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function PaginationBar({ page, totalPages, onPrev, onNext, compact = false }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <View style={[styles.row, compact ? styles.compact : null]}>
      <Button title="Prev" variant="outline" disabled={page <= 1} onPress={onPrev} />
      <Text style={styles.meta}>
        {page} / {totalPages}
      </Text>
      <Button title="Next" variant="outline" disabled={page >= totalPages} onPress={onNext} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compact: { marginTop: 6 },
  meta: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
})

export default memo(PaginationBar)
