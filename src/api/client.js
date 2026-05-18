import axios from 'axios'
import { clearSession, getTokenSync } from '../auth/tokenStore'

/** No trailing slash. Must match server mount (routes use paths like `/auth/login`). */
const rawBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api'
const baseURL = String(rawBase).trim().replace(/\/+$/, '')

export const api = axios.create({ baseURL })

// ---------------------------------------------------------------------------
// Inflight deduplication for GET requests.
// When several components (tabs, contexts) fire the same GET at the same moment
// only one real HTTP request goes out; all callers share the single promise.
// Any non-GET request invalidates the inflight map so stale data is never served.
// ---------------------------------------------------------------------------
const _inflight = new Map()

function _inflightKey(url, params) {
  const scope = getTokenSync() ? 'authed' : 'anon'
  try {
    return `${url}|${JSON.stringify(params ?? {})}|${scope}`
  } catch {
    return `${url}|?|${scope}`
  }
}

const _rawGet = api.get.bind(api)
api.get = function dedupedGet(url, config = {}) {
  const key = _inflightKey(url, config?.params)
  const running = _inflight.get(key)
  if (running) return running
  const p = _rawGet(url, config).finally(() => _inflight.delete(key))
  _inflight.set(key, p)
  return p
}

api.interceptors.request.use((config) => {
  const token = getTokenSync()
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  // React Native / axios: never send multipart without a boundary. If something set a bare
  // `multipart/form-data`, remove it so the runtime adds `multipart/form-data; boundary=...`.
  const data = config.data
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const h = config.headers
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type')
      h.delete('content-type')
    } else if (h) {
      delete h['Content-Type']
      delete h['content-type']
    }
  }
  // Any mutation clears inflight map so next GET gets fresh data.
  const method = String(config.method || 'get').toLowerCase()
  if (method !== 'get') {
    _inflight.clear()
  }
  return config
})

let clearingUnauthorizedSession = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    // If server says JWT is invalid/expired, treat user as logged out.
    if (status === 401 && getTokenSync() && !clearingUnauthorizedSession) {
      clearingUnauthorizedSession = true
      try {
        await clearSession()
      } finally {
        clearingUnauthorizedSession = false
      }
    }
    return Promise.reject(error)
  },
)
