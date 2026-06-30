/**
 * Normalize expo-document-picker assets and build multipart parts multer will accept.
 * Android often sends application/octet-stream or omits name/mime.
 * Web must append real File/Blob parts — { uri, name, type } objects become "[object Object]" text.
 */

import { Platform } from 'react-native'

const EXT_RE = /\.(pdf|jpe?g|jpeg|png|gif|webp|heic|heif|bmp)$/i

/**
 * Busboy skips parts with an empty filename; RN uses `name` as that filename.
 * Always send a non-empty name with an extension so the part is parsed as a file.
 */
function ensureMultipartFilename(n) {
  let name = String(n.name || '').trim() || 'upload'
  let type = String(n.mimeType || n.type || '').trim().toLowerCase()

  if (!type || type === 'application/octet-stream') {
    if (name.toLowerCase().endsWith('.pdf')) type = 'application/pdf'
    else if (/\.png$/i.test(name)) type = 'image/png'
    else if (EXT_RE.test(name)) type = 'image/jpeg'
    else type = 'image/jpeg'
  }

  if (!EXT_RE.test(name)) {
    const ext =
      type === 'application/pdf' ? '.pdf' : type === 'image/png' ? '.png' : '.jpg'
    const base = name.replace(/\.+$/, '').trim() || 'upload'
    name = `${base}${ext}`
  }

  if (!/\S/.test(name)) {
    name = type === 'application/pdf' ? 'document.pdf' : 'document.jpg'
  }

  return { uri: n.uri, name, type }
}

export function normalizePickedDocument(raw) {
  if (!raw || typeof raw !== 'object') return null

  if (typeof File !== 'undefined' && raw instanceof File) {
    return {
      uri: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(raw) : '',
      name: raw.name || 'upload',
      mimeType: raw.type || '',
      size: raw.size || 0,
      file: raw,
    }
  }

  const embeddedFile = typeof File !== 'undefined' && raw.file instanceof File ? raw.file : null
  const uri = typeof raw.uri === 'string' ? raw.uri.trim() : String(raw.uri || '').trim()
  if (!uri && !embeddedFile) return null

  let name = raw.name != null ? String(raw.name).trim() : ''
  if (!name && embeddedFile) name = embeddedFile.name || ''
  if (!name && uri) {
    const tail = uri.replace(/[/\\?#]+$/, '').split(/[/\\]/).pop() || ''
    try {
      name = decodeURIComponent(tail.replace(/\+/g, ' ')).trim()
    } catch {
      name = tail.trim()
    }
    if (!name) name = 'document'
  }

  const size = Number(raw.size ?? raw.fileSize ?? embeddedFile?.size ?? 0) || 0
  let mimeType = String(raw.mimeType || embeddedFile?.type || '').trim().toLowerCase()
  const lowerName = name.toLowerCase()

  if (!mimeType || mimeType === 'application/octet-stream') {
    if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf'
    else if (/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/.test(lowerName)) {
      if (lowerName.endsWith('.png')) mimeType = 'image/png'
      else mimeType = 'image/jpeg'
    }
  }

  return {
    uri: uri || (embeddedFile && typeof URL !== 'undefined' ? URL.createObjectURL(embeddedFile) : ''),
    name,
    mimeType,
    size,
    ...(embeddedFile ? { file: embeddedFile } : {}),
  }
}

export function isUploadableDocument(asset) {
  const n = normalizePickedDocument(asset)
  if (!n) return false
  if (n.file instanceof File) return true
  return Boolean(n.uri)
}

async function resolveFormDataPart(asset) {
  const n = normalizePickedDocument(asset)
  if (!n) return null

  if (n.file instanceof File) {
    const { name, type } = ensureMultipartFilename(n)
    if (n.file.name === name && n.file.type === type) return n.file
    return new File([n.file], name, { type })
  }

  if (Platform.OS === 'web') {
    if (!n.uri) return null
    const resp = await fetch(n.uri)
    const blob = await resp.blob()
    const { name, type } = ensureMultipartFilename(n)
    return new File([blob], name, { type })
  }

  const { uri, name, type } = ensureMultipartFilename(n)
  if (!uri) return null
  return { uri, name, type }
}

export async function appendFormDataFile(fd, field, asset) {
  const part = await resolveFormDataPart(asset)
  if (!part) return false
  fd.append(field, part)
  return true
}

export async function appendFormDataFiles(fd, field, assets) {
  if (!Array.isArray(assets)) return 0
  let count = 0
  for (const asset of assets) {
    if (await appendFormDataFile(fd, field, asset)) count += 1
  }
  return count
}
