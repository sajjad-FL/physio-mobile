/* eslint-env node */
/**
 * Merges `app.json` with env-based EAS project id (required for getExpoPushTokenAsync).
 * After `eas login` + `eas init`, copy Project ID here or into `.env`:
 * EXPO_PUBLIC_EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const appJson = require('./app.json')

module.exports = () => {
  const expo = appJson.expo || {}
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_EAS_PROJECT_ID === 'string'
      ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID.trim()
      : ''
  const fromJson = String((expo.extra || {}).eas?.projectId || '').trim()
  const projectId =
    fromEnv || fromJson || '64e19898-a95a-4bae-a270-8d4a0645c2d8'
  /** Prefer EXPO_MAPBOX_TOKEN in `.env`; optional override EXPO_PUBLIC_MAPBOX_TOKEN. */
  const mapboxAccessToken = String(
    process.env.EXPO_MAPBOX_TOKEN ||
      process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
      (expo.extra || {}).mapboxAccessToken ||
      ''
  ).trim()

  const mergedExtra = {
    ...(expo.extra || {}),
    mapboxAccessToken,
    eas: {
      ...((expo.extra || {}).eas || {}),
      ...(projectId ? { projectId } : {}),
    },
  }

  return {
    expo: {
      ...expo,
      ios: {
        ...(expo.ios || {}),
        config: {
          ...((expo.ios || {}).config || {}),
          usesNonExemptEncryption: false,
        },
        infoPlist: {
          ...((expo.ios || {}).infoPlist || {}),
          ITSAppUsesNonExemptEncryption: false,
        },
      },
      extra: mergedExtra,
    },
  }
}
