import { memo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { r } from '../../theme/radius'

/**
 * Single-select dropdown.
 * Props: label, value, placeholder, options ([{ value, label }]), onSelect
 * variant: 'modal' (default) — centered sheet; 'inline' — list expands below control (no second modal).
 */
function DropdownField({ label, value, placeholder = 'Select…', options, onSelect, variant = 'modal' }) {
  const [open, setOpen] = useState(false)
  const selected = options?.find((o) => o.value === value)

  const optionList = (options || []).map((opt) => {
    const active = value === opt.value
    return (
      <Pressable
        key={String(opt.value)}
        style={[styles.item, active && styles.itemActive]}
        onPress={() => {
          onSelect(opt.value)
          setOpen(false)
        }}
      >
        <Text style={[styles.itemTxt, active && styles.itemTxtActive]}>{opt.label}</Text>
        {active ? <Ionicons name="checkmark" size={16} color={colors.brand} /> : null}
      </Pressable>
    )
  })

  if (variant === 'inline') {
    return (
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Pressable
          style={styles.btn}
          onPress={() => setOpen((o) => !o)}
          disabled={!options?.length}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Text style={[styles.btnTxt, !selected && styles.placeholder]} numberOfLines={1}>
            {selected ? selected.label : placeholder}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textSecondary} />
        </Pressable>
        {open ? (
          <View style={styles.inlineSheet}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.inlineScroll}>
              {optionList}
            </ScrollView>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={styles.btn}
        onPress={() => setOpen(true)}
        disabled={!options?.length}
        accessibilityRole="button"
      >
        <Text style={[styles.btnTxt, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.textSecondary} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {optionList}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontFamily: font.semiBold, fontSize: type.sm, color: colors.slate700 },
  btn: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: r.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
  },
  btnTxt: { fontFamily: font.regular, fontSize: type.base, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textTertiary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', padding: 14, justifyContent: 'center' },
  sheet: {
    borderRadius: r.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  sheetTitle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.textPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemActive: { backgroundColor: colors.teal50 },
  itemTxt: { fontFamily: font.regular, fontSize: type.base, color: colors.slate700, flex: 1 },
  itemTxtActive: { fontFamily: font.semiBold, color: colors.brand },

  inlineSheet: {
    marginTop: 6,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  inlineScroll: { maxHeight: 260 },
})

export default memo(DropdownField)
