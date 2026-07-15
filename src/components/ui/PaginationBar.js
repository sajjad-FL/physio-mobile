import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from './Button'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

export const PAGE_SIZE_OPTIONS = [10, 20, 50]

function rangeLabel(page, pageSize, total) {
  const t = Number(total)
  if (!Number.isFinite(t) || t <= 0) return null
  const size = Number(pageSize) || 10
  return {
    from: (page - 1) * size + 1,
    to: Math.min(page * size, t),
    total: t,
  }
}

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  compact = false,
  total,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const showPages = Number(totalPages) > 1
  const showPageSize = Boolean(onPageSizeChange && pageSize)
  const range = rangeLabel(page, pageSize, total)
  const showTotalOnly = !showPageSize && !range && Number.isFinite(Number(total)) && Number(total) > 0

  if (!showPages && !showPageSize && !range && !showTotalOnly) return null

  return (
    <View style={[styles.wrap, compact ? styles.compact : null]}>
      {(range || showTotalOnly || showPageSize) ? (
        <View style={styles.metaRow}>
          {range ? (
            <Text style={styles.range}>
              <Text style={styles.rangeStrong}>
                {range.from}–{range.to}
              </Text>
              <Text style={styles.rangeMuted}> / </Text>
              <Text style={styles.rangeMuted}>{range.total}</Text>
            </Text>
          ) : showTotalOnly ? (
            <Text style={styles.range}>
              <Text style={styles.rangeStrong}>{Number(total)}</Text>
              <Text style={styles.rangeMuted}> total</Text>
            </Text>
          ) : (
            <View />
          )}

          {showPageSize ? (
            <View style={styles.sizeRow}>
              {pageSizeOptions.map((size) => {
                const active = Number(pageSize) === Number(size)
                return (
                  <Pressable
                    key={size}
                    onPress={() => onPageSizeChange(size)}
                    style={[styles.sizeChip, active ? styles.sizeChipActive : null]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${size} per page`}
                  >
                    <Text style={[styles.sizeChipText, active ? styles.sizeChipTextActive : null]}>
                      {size}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {showPages ? (
        <View style={styles.row}>
          <Button title="Prev" variant="outline" disabled={page <= 1} onPress={onPrev} />
          <Text style={styles.meta}>
            {page} / {totalPages}
          </Text>
          <Button title="Next" variant="outline" disabled={page >= totalPages} onPress={onNext} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 10 },
  compact: { marginTop: 6 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  range: { fontFamily: font.medium, fontSize: type.sm, color: colors.textSecondary },
  rangeStrong: { fontFamily: font.semiBold, color: colors.textPrimary },
  rangeMuted: { fontFamily: font.medium, color: colors.textSecondary },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sizeChip: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  sizeChipText: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textSecondary,
  },
  sizeChipTextActive: { color: colors.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  meta: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textSecondary },
})

export default memo(PaginationBar)
