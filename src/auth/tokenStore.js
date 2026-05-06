import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const TOKEN_KEY = 'pk_token'
const ROLE_KEY = 'pk_role'
const PROFILE_COMPLETE_KEY = 'pk_profile_complete'

/** Web: SecureStore has no native impl (ExpoSecureStore.web is {}). */
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

function webDelete(key) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(WEB_PREFIX + key)
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

async function storageDeleteItem(key) {
  if (USE_WEB_STORAGE) {
    webDelete(key)
    return
  }
  await SecureStore.deleteItemAsync(key).catch(() => {})
}

/** In-memory copy for axios sync interceptor (hydrate on app start). */
let memoryToken = null
let memoryRole = 'user'
let memoryProfileComplete = null

const listeners = new Set()

export function subscribeAuth(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emit() {
  listeners.forEach((cb) => {
    try {
      cb()
    } catch (_) {}
  })
}

export function getTokenSync() {
  return memoryToken
}

/** @returns {'user'|'physio'|'admin'} */
export function getRoleSync() {
  if (memoryRole === 'patient') return 'user'
  if (memoryRole === 'user' || memoryRole === 'physio' || memoryRole === 'admin') return memoryRole
  return 'user'
}

export function getRolesSync() {
  return [getRoleSync()]
}

export function getProfileCompleteSync() {
  if (memoryProfileComplete === true) return true
  if (memoryProfileComplete === false) return false
  return null
}

export async function hydrateFromStorage() {
  try {
    const [t, r, pc] = await Promise.all([
      storageGetItem(TOKEN_KEY),
      storageGetItem(ROLE_KEY),
      storageGetItem(PROFILE_COMPLETE_KEY),
    ])
    memoryToken = t || null
    memoryRole = r === 'physio' || r === 'admin' || r === 'user' ? r : r === 'patient' ? 'user' : 'user'
    memoryProfileComplete = pc === '1' ? true : pc === '0' ? false : null
  } catch {
    memoryToken = null
    memoryRole = 'user'
    memoryProfileComplete = null
  }
  emit()
}

/**
 * @param {string} token
 * @param {string} role
 * @param {boolean} [isProfileComplete]
 */
export async function setSession(token, role, isProfileComplete) {
  const norm =
    role === 'physio' || role === 'admin' ? role : role === 'patient' || role === 'user' ? 'user' : 'user'
  memoryToken = token
  memoryRole = norm
  if (typeof isProfileComplete === 'boolean') {
    memoryProfileComplete = isProfileComplete
    await storageSetItem(PROFILE_COMPLETE_KEY, isProfileComplete ? '1' : '0')
  }
  await storageSetItem(TOKEN_KEY, token)
  await storageSetItem(ROLE_KEY, norm)
  emit()
}

export async function clearSession() {
  memoryToken = null
  memoryRole = 'user'
  memoryProfileComplete = null
  await Promise.all([
    storageDeleteItem(TOKEN_KEY),
    storageDeleteItem(ROLE_KEY),
    storageDeleteItem(PROFILE_COMPLETE_KEY),
  ])
  emit()
}
