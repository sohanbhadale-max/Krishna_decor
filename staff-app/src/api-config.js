import { Capacitor } from '@capacitor/core'

const API_SETTING_KEY = 'krishna-decor-staff-api-url'
const builtApiUrl = String(import.meta.env.VITE_API_URL || '').trim()
export const DEFAULT_CLOUD_API_URL = 'https://krishna-decor-api.onrender.com/api'

export function normalise(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let url
  try {
    url = new URL(raw)
  } catch {
    return ''
  }
  const base = url.toString().replace(/\/$/, '')
  return base.endsWith('/api') ? base : base + '/api'
}

function isNative() {
  try {
    if (typeof window === 'undefined') return false
    if (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) return true
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return true
    if (window.location.protocol === 'capacitor:') return true
    return false
  } catch {
    return false
  }
}

function isLocalOrLanUrl(urlStr) {
  return /^(https?:\/\/)?(127\.0\.0\.1|localhost|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/i.test(String(urlStr || ''))
}

export function apiBase() {
  if (builtApiUrl) return normalise(builtApiUrl)
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(API_SETTING_KEY) : null
  if (stored) {
    try {
      if (isNative() && isLocalOrLanUrl(stored)) {
        localStorage.removeItem(API_SETTING_KEY)
      } else {
        const norm = normalise(stored)
        if (norm) return norm
      }
    } catch {}
  }
  // On native mobile (Android / iOS), ALWAYS default to cloud API! Never use 127.0.0.1:8788
  if (isNative()) {
    return DEFAULT_CLOUD_API_URL
  }
  // Only for desktop browser local development (non-native localhost)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8788/api'
  }
  return DEFAULT_CLOUD_API_URL
}

export function setApiBase(value) {
  const base = normalise(value)
  if (base) localStorage.setItem(API_SETTING_KEY, base)
  return base
}

export function clearApiBase() {
  localStorage.removeItem(API_SETTING_KEY)
}

export function apiUrl(path) {
  return apiBase() + path
}
