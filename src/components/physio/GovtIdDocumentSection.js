import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import DropdownField from '../ui/DropdownField'
import { ID_PROOF_TYPE_OPTIONS } from '../../constants/idProofTypes'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function IdProofPreview({ asset }) {
  const mime = String(asset?.mimeType || '').toLowerCase()
  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(String(asset?.name || ''))
  const displayName = asset?.name && String(asset.name).trim() ? asset.name : 'Selected file'

  return (
    <View style={styles.docPreviewContainer}>
      {isImage ? (
        <Image source={{ uri: asset.uri }} style={styles.docThumb} accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.docIconWrap}>
          <Ionicons name={isPdf ? 'document-text' : 'document-attach'} size={24} color={colors.brand} />
        </View>
      )}
      <View style={styles.docDetailsCol}>
        <Text style={styles.docName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.tapToReplace}>Tap to replace file</Text>
      </View>
    </View>
  )
}

export default function GovtIdDocumentSection({
  idProofType,
  onSelectIdType,
  onPressIdType,
  idProofAsset,
  existingIdProofUrl,
  onPickIdProof,
  error,
  useDropdown = true,
}) {
  const idTypeError = error?.idProofType
  const idProofError = error?.idProof
  const hasFile = Boolean(idProofAsset?.uri || existingIdProofUrl)
  const idTypeLabel = ID_PROOF_TYPE_OPTIONS.find((o) => o.value === idProofType)?.label || ''

  return (
    <View style={[styles.card, idProofError || idTypeError ? styles.cardError : null]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>GOVERNMENT ID</Text>
        <View style={styles.badgeRequired}>
          <Text style={styles.badgeRequiredText}>Required</Text>
        </View>
      </View>

      {useDropdown ? (
        <DropdownField
          label="GOVT ID Type"
          value={idProofType}
          placeholder="Select GOVT ID type"
          options={ID_PROOF_TYPE_OPTIONS}
          onSelect={onSelectIdType}
          variant="inline"
        />
      ) : (
        <Pressable style={styles.optionRow} onPress={onPressIdType}>
          <Text style={styles.optionLabel}>GOVT ID Type</Text>
          <Text style={[styles.optionValue, !idTypeLabel && styles.optionPlaceholder]}>
            {idTypeLabel || 'Select GOVT ID type'}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onPickIdProof}
        style={({ pressed }) => [
          styles.uploadBox,
          hasFile ? styles.uploadBoxFilled : null,
          pressed && styles.uploadBoxPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Upload government ID"
      >
        {hasFile && idProofAsset?.uri ? (
          <IdProofPreview asset={idProofAsset} />
        ) : hasFile ? (
          <View style={styles.uploadPromptRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.uploadedText}>Government ID uploaded</Text>
          </View>
        ) : (
          <View style={styles.uploadPromptRow}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.brand} />
            <Text style={styles.uploadPromptText}>Tap to upload GOVERNMENT ID</Text>
          </View>
        )}
      </Pressable>

      {idTypeError ? <Text style={styles.fieldErr}>{idTypeError}</Text> : null}
      {idProofError ? <Text style={styles.fieldErr}>{idProofError}</Text> : null}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.ink,
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
  optionRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  optionLabel: {
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.slate500,
    marginBottom: 2,
  },
  optionValue: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.ink,
  },
  optionPlaceholder: {
    color: colors.slate400,
    fontFamily: font.regular,
  },
  uploadBox: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brandSoft,
    backgroundColor: colors.teal50,
    padding: 12,
  },
  uploadBoxFilled: {
    borderStyle: 'solid',
    backgroundColor: colors.white,
  },
  uploadBoxPressed: {
    opacity: 0.85,
  },
  uploadPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  uploadPromptText: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.brand,
  },
  uploadedText: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.success,
  },
  docPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.slate100,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docDetailsCol: {
    flex: 1,
  },
  docName: {
    fontFamily: font.semiBold,
    fontSize: type.sm,
    color: colors.ink,
  },
  tapToReplace: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.slate500,
    marginTop: 2,
  },
  fieldErr: {
    marginTop: 6,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: colors.danger,
  },
})
