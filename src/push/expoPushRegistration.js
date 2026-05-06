import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'

const ANDROID_DEFAULT_CHANNEL = 'default'

/** Call once at startup (imported from App.js). */
export function configureNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
    name: 'Booking updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  })
}

function resolveProjectId() {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_EAS_PROJECT_ID === 'string'
      ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID.trim()
      : ''
  if (fromEnv) return fromEnv
  return Constants.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || undefined
}

/**
 * Returns Expo push token or null if unavailable (denied permission, simulator, missing project id, etc.).
 */
export async function getExpoPushTokenOrNull() {
  if (Platform.OS === 'web') return null

  await ensureAndroidChannel()

  const perm = await Notifications.getPermissionsAsync()
  let granted = perm.granted || perm.status === 'granted'
  if (
    Platform.OS === 'ios' &&
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    granted = true
  }

  let finalGranted = granted
  if (!granted && perm.canAskAgain !== false) {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    })
    finalGranted =
      req.granted ||
      req.status === 'granted' ||
      (Platform.OS === 'ios' &&
        req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
  }

  if (!finalGranted) return null

  const projectId = resolveProjectId()
  try {
    const opts = projectId ? { projectId } : {}
    const { data } = await Notifications.getExpoPushTokenAsync(opts)
    return data && String(data).startsWith('ExponentPushToken[') ? data : null
  } catch {
    return null
  }
}

export { ANDROID_DEFAULT_CHANNEL }
