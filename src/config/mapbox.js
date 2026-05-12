import Constants from 'expo-constants'

/**
 * Public Mapbox token (pk.*).
 * Primary: `EXPO_MAPBOX_TOKEN` in `.env` → injected at build/start via `app.config.js` into `extra.mapboxAccessToken`.
 * Fallback: `EXPO_PUBLIC_MAPBOX_TOKEN` if inlined by Metro.
 */
export function getMapboxAccessToken() {
  const fromExtra = String(Constants.expoConfig?.extra?.mapboxAccessToken || '').trim()
  const fromPublic = String(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '').trim()
  return fromExtra || fromPublic
}

export const MAPBOX_STYLE_STREETS = 'mapbox/streets-v12'
