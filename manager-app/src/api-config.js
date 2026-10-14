import { Capacitor } from '@capacitor/core'

const API_SETTING_KEY = 'krishna-decor-manager-api-url'
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

  // In Windows Desktop app (Electron), use configured cloudUrl from krishnaHub if present
  if (typeof window !== 'undefined' && window.krishnaHub && window.krishnaHub.cloudUrl) {
    try {
      const normHub = normalise(window.krishnaHub.cloudUrl)
      if (normHub && !isLocalOrLanUrl(normHub)) return normHub
    } catch {}
  }

  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(API_SETTING_KEY) : null
  if (stored) {
    try {
      // Clear obsolete localhost / local LAN IPs from prior versions
      if (isLocalOrLanUrl(stored)) {
        localStorage.removeItem(API_SETTING_KEY)
      } else {
        const norm = normalise(stored)
        if (norm) return norm
      }
    } catch {}
  }

  // All 3 apps (Android Manager, Android Staff, Windows Desktop) default to the 24/7 Cloud backend
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
