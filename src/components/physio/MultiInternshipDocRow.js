import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function FileChip({ asset, onRemove }) {
  const mime = String(asset?.mimeType || '').toLowerCase()
  const isImage = mime.startsWith('image/')
  const name = asset?.name && String(asset.name).trim() ? asset.name : 'Selected file'

  return (
    <View style={styles.chip}>
      {isImage && asset?.uri ? (
        <Image source={{ uri: asset.uri }} style={styles.chipThumb} accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.chipIcon}>
          <Ionicons name="document-text" size={16} color={colors.brand} />
        </View>
      )}
      <Text style={styles.chipName} numberOfLines={1}>
        {name}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Remove file">
          <Ionicons name="close-circle" size={18} color={colors.slate400} />
        </Pressable>
      ) : null}
    </View>
  )
}

export default function MultiInternshipDocRow({
  assets = [],
  existingUrls = [],
  error,
  onAdd,
  onRemove,
}) {
  const totalCount = assets.length + existingUrls.length

  return (
    <View style={[styles.card, error ? styles.cardError : null]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Internship certificate</Text>
          <Text style={styles.subtitle}>Upload one or more internship certificates.</Text>
        </View>
        <View style={styles.badgeRequired}>
          <Text style={styles.badgeRequiredText}>Required</Text>
        </View>
      </View>

      {existingUrls.map((url, index) => (
        <View key={`existing-${url}-${index}`} style={styles.existingRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.existingText} numberOfLines={1}>
            Uploaded certificate {index + 1}
          </Text>
        </View>
      ))}

      {assets.map((asset, index) => (
        <FileChip key={`${asset.uri}-${index}`} asset={asset} onRemove={() => onRemove?.(index)} />
      ))}

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Add internship certificates"
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
        <Text style={styles.addBtnText}>
          {totalCount > 0 ? 'Add more certificates' : 'Add certificate(s)'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: 14,
  },
  cardError: {
    borderColor: colors.danger,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.slate500,
    marginTop: 2,
  },
  badgeRequired: {
    backgroundColor: colors.rose50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeRequiredText: {
    fontFamily: font.semiBold,
    fontSize: 10,
    color: colors.danger,
  },
  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  existingText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.slate600,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slate200,
  },
  chipThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.slate100,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipName: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.ink,
  },
  addBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
    paddingVertical: 12,
  },
  addBtnPressed: {
    opacity: 0.85,
  },
  addBtnText: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.brand,
  },
  fieldErr: {
    marginTop: 8,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.danger,
  },
})
