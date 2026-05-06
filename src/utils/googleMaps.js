import { Linking, Platform } from 'react-native'

function readLatLng(coordinates) {
  const lat = Number(coordinates?.lat)
  const lng = Number(coordinates?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function buildGoogleMapsDestinationUrl({ coordinates, address }) {
  const point = readLatLng(coordinates)
  if (point) {
    return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`
  }
  const label = String(address || '').trim()
  if (!label) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(label)}`
}

/** Opens Google Maps directions on device. */
export async function openGoogleMapsDestination(payload) {
  const url = buildGoogleMapsDestinationUrl(payload)
  if (!url) return false

  let mapsUrl = url
  const point = readLatLng(payload?.coordinates)
  if (Platform.OS === 'ios' && point) {
    mapsUrl = `maps://?daddr=${point.lat},${point.lng}`
  }

  try {
    const can = await Linking.canOpenURL(mapsUrl)
    if (can) {
      await Linking.openURL(mapsUrl)
      return true
    }
    await Linking.openURL(url)
    return true
  } catch {
    try {
      await Linking.openURL(url)
      return true
    } catch {
      return false
    }
  }
}
