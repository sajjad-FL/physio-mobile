import { memo } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { r } from '../../theme/radius'

function FilterSheet({
  visible,
  title = 'Filters',
  subtitle,
  sections = [],
  onClose,
  onReset,
  onApply,
  children,
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="options-outline" size={15} color={colors.brand} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.headerRight}>
              {onReset ? (
                <Pressable onPress={onReset} hitSlop={8} style={styles.resetBtn}>
                  <Text style={styles.resetTxt}>Reset</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={16} color={colors.slate500} />
              </Pressable>
            </View>
          </View>

          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}

          {/* Sections */}
          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <View style={styles.chips}>
                {section.options.map((x) => (
                  <Pressable
                    key={x.value}
                    style={[styles.chip, x.active && styles.chipActive]}
                    onPress={x.onPress}
                  >
                    {x.active ? (
                      <View style={styles.chipDot} />
                    ) : null}
                    <Text style={[styles.chipTxt, x.active && styles.chipTxtActive]}>
                      {x.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {children}

          {/* Footer */}
          <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
            <View style={styles.footer}>
              <Pressable style={styles.applyBtn} onPress={onApply || onClose}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.applyTxt}>{onApply ? 'Apply filters' : 'Done'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 180,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: r.full,
    backgroundColor: colors.slate200,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: r.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  resetTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: r.full,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginBottom: 10 },

  // Sections
  section: { marginTop: 18 },
  sectionLabel: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // Chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.teal50,
    borderColor: colors.brand,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  chipTxt: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.slate600,
  },
  chipTxtActive: {
    color: colors.teal800,
  },

  // Footer
  footerSafe: { flexGrow: 0 },
  footer: { marginTop: 22, marginBottom: 4 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  applyTxt: { fontFamily: font.bold, fontSize: type.base, color: colors.white },
})

export default memo(FilterSheet)
