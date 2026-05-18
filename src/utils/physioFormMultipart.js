/**
 * Normalize expo-document-picker assets and build multipart parts multer will accept.
 * Android often sends application/octet-stream or omits name/mime.
 */

const EXT_RE = /\.(pdf|jpe?g|jpeg|png|gif|webp|heic|heif|bmp)$/i

/**
 * Busboy skips parts with an empty filename; RN uses `name` as that filename.
 * Always send a non-empty name with an extension so the part is parsed as a file.
 */
function ensureMultipartFilename(n) {
  let name = String(n.name || '').trim() || 'upload'
  let type = String(n.mimeType || '').trim().toLowerCase()

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
  const uri = typeof raw.uri === 'string' ? raw.uri.trim() : String(raw.uri || '').trim()
  if (!uri) return null

  let name = raw.name != null ? String(raw.name).trim() : ''
  if (!name) {
    const tail = uri.replace(/[/\\?#]+$/, '').split(/[/\\]/).pop() || ''
    try {
      name = decodeURIComponent(tail.replace(/\+/g, ' ')).trim()
    } catch {
      name = tail.trim()
    }
    if (!name) name = 'document'
  }

  const size = Number(raw.size ?? raw.fileSize ?? 0) || 0
  let mimeType = String(raw.mimeType || '').trim().toLowerCase()
  const lowerName = name.toLowerCase()

  if (!mimeType || mimeType === 'application/octet-stream') {
    if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf'
    else if (/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/.test(lowerName)) {
      if (lowerName.endsWith('.png')) mimeType = 'image/png'
      else mimeType = 'image/jpeg'
    }
  }

  return { uri, name, mimeType, size }
}

export function appendFormDataFile(fd, field, asset) {
  const n = normalizePickedDocument(asset)
  if (!n?.uri) return
  const { uri, name, type } = ensureMultipartFilename(n)
  fd.append(field, { uri, name, type })
}
