const API_SETTING_KEY = 'krishna-decor-staff-api-url'
const builtApiUrl = String(import.meta.env.VITE_API_URL || '').trim()

export const DEFAULT_CLOUD_API_URL = 'https://krishna-decor-api.onrender.com/api'

function normalise(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Enter a complete sync address, for example https://krishna-decor-api.onrender.com/api.')
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('The sync address must use http or https.')
  const base = url.toString().replace(/\/$/, '')
  return base.endsWith('/api') ? base : base + '/api'
}

export function apiBase() {
  if (builtApiUrl) return normalise(builtApiUrl)
  const stored = localStorage.getItem(API_SETTING_KEY)
  if (stored) {
    try {
      const norm = normalise(stored)
      // Auto-clean obsolete LAN/local development IPs that fail on phone networks
      if (!norm.includes('192.168.') && !norm.includes('localhost') && !norm.includes('127.0.0.1') && !norm.includes('10.0.')) {
        return norm
      }
    } catch {}
  }
  return DEFAULT_CLOUD_API_URL
}

export function isApiConfigured() {
  return Boolean(apiBase())
}

export function canConfigureApiBase() {
  return true
}

export function setApiBase(value) {
  const base = normalise(value)
  localStorage.setItem(API_SETTING_KEY, base)
  return base
}

export function clearApiBase() {
  localStorage.removeItem(API_SETTING_KEY)
}

export function apiUrl(path) {
  const base = apiBase()
  if (!base) throw new Error('The Krishna Decor sync address is not configured.')
  return base + path
}
