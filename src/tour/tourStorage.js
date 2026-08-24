import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const TOUR_COMPLETED_KEY = 'patient_app_tour_v1_completed'

const USE_WEB_STORAGE = Platform.OS === 'web'
const WEB_PREFIX = '__pk_ss__'

function webGet(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(WEB_PREFIX + key)
  } catch {
    return null
  }
}

function webSet(key, value) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(WEB_PREFIX + key, value)
  } catch (_) {}
}

async function storageGetItem(key) {
  if (USE_WEB_STORAGE) return webGet(key)
  return SecureStore.getItemAsync(key)
}

async function storageSetItem(key, value) {
  if (USE_WEB_STORAGE) {
    webSet(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function getPatientTourCompleted() {
  const value = await storageGetItem(TOUR_COMPLETED_KEY)
  return value === '1'
}

export async function setPatientTourCompleted() {
  await storageSetItem(TOUR_COMPLETED_KEY, '1')
}
