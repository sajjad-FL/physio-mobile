import * as DocumentPicker from 'expo-document-picker'
import Toast from 'react-native-toast-message'
import { normalizePickedDocument } from './physioFormMultipart'
import { validateFileAsset } from './onboardingValidation'

/**
 * @param {string} label
 * @returns {Promise<object[]>}
 */
export async function pickMultipleDocuments(label) {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: true,
      base64: false,
    })
    if (res?.canceled === true || res?.assets == null) return []

    const rawAssets = Array.isArray(res.assets) ? res.assets : []
    const legacy =
      rawAssets.length === 0 &&
      typeof res.uri === 'string' &&
      res.uri
        ? [{ uri: res.uri, name: res.name, mimeType: res.mimeType, size: res.size }]
        : []

    const picked = []
    for (const raw of [...rawAssets, ...legacy]) {
      const wrapped = normalizePickedDocument(raw)
      if (!wrapped?.uri) continue
      const v = validateFileAsset(wrapped, label)
      if (!v.ok) {
        Toast.show({ type: 'error', text1: v.message })
        continue
      }
      picked.push(wrapped)
    }
    return picked
  } catch (e) {
    Toast.show({ type: 'error', text1: e.message || 'Could not pick files' })
    return []
  }
}
