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
  const projectId = fromEnv || fromJson
  const mergedExtra = {
    ...(expo.extra || {}),
    eas: {
      ...((expo.extra || {}).eas || {}),
      ...(projectId ? { projectId } : {}),
    },
  }

  return {
    expo: {
      ...expo,
      extra: mergedExtra,
    },
  }
}
