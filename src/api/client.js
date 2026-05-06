import axios from 'axios'
import { getTokenSync, getRolesSync } from '../auth/tokenStore'

/** No trailing slash. Must match server mount (routes use paths like `/auth/login`). */
const rawBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api'
const baseURL = String(rawBase).trim().replace(/\/+$/, '')

export const api = axios.create({ baseURL })

const adminKey = process.env.EXPO_PUBLIC_ADMIN_API_KEY || ''

function useAdminAuth(config) {
  const url = config.url || ''
  const roles = getRolesSync()
  const jwtIsAdmin = roles.includes('admin') && getTokenSync()

  if (url.startsWith('/physios/nearby')) {
    return false
  }

  const method = (config.method || 'get').toLowerCase()
  const path = url.split('?')[0]

  if (path.startsWith('/withdraw/pending') || (path === '/withdraw' && method === 'post')) {
    return false
  }

  const isWithdrawAdminUrl =
    (path === '/withdraw' && method === 'get') || (method === 'patch' && /^\/withdraw\/[^/]+$/.test(path))

  const isAdminUrl =
    url.startsWith('/admin') ||
    isWithdrawAdminUrl ||
    (url === '/payment/release' && method === 'post') ||
    (url === '/bookings' && method === 'get') ||
    (Boolean(url.match(/^\/bookings\/[^/]+$/)) && method === 'patch') ||
    (Boolean(url.match(/^\/bookings\/[^/]+\/verify-payment$/)) && method === 'patch') ||
    (Boolean(url.match(/^\/bookings\/[^/]+\/reject-payment$/)) && method === 'patch') ||
    ((url === '/physios' || url.startsWith('/physios?')) && (method === 'get' || method === 'post'))

  if (isAdminUrl) {
    if (jwtIsAdmin) {
      return false
    }
    if (adminKey) {
      config.headers.Authorization = 'Bearer ' + adminKey
      return true
    }
  }

  return false
}

api.interceptors.request.use((config) => {
  if (useAdminAuth(config)) {
    return config
  }
  const token = getTokenSync()
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})
