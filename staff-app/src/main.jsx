import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, CheckCircle2, ClipboardPenLine, LogOut, MapPin, Package, Pencil, RefreshCw, Ruler, Save, ShoppingCart, Trash2, X } from 'lucide-react'
import './styles.css'
import { apiUrl, apiBase, setApiBase, clearApiBase, DEFAULT_CLOUD_API_URL } from './api-config.js'

const SESSION_KEY = 'krishna-decor-staff-session'
const SYNC_QUEUE_KEY = 'krishna-decor-staff-submission-queue'
const usernameAlias = (name) => {
  const localPart = String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 60) || 'user'
  return localPart + '@krishnadecor.local'
}
// Individual curtain materials:
// Valence: renamed from Valence curtain, sheer and lining removed
// American: individual materials American main curtain, American sheer curtain, American lining
// Eyelet & Ripple: individual materials for main, sheer, lining
const INDIVIDUAL_CURTAIN_PRODUCTS = [
  'American main curtain',
  'American sheer curtain',
  'American lining',
  'Eyelet main curtain',
  'Eyelet sheer curtain',
  'Eyelet lining',
  'Ripple main curtain',
  'Ripple sheer curtain',
  'Ripple lining',
  'Valence'
]

// Legacy bundle definitions kept empty so automated computation of sheer and lining is removed
const CURTAIN_SYSTEMS = []

function isCurtainProduct(productName) {
  if (!productName) return false
  const p = String(productName).toLowerCase().trim()
  if (p === 'shower curtain') return false
  if (p.includes('stitching')) return false
  return INDIVIDUAL_CURTAIN_PRODUCTS.some(c => c.toLowerCase() === p) ||
    p.includes('curtain') || p.includes('sheer') || p.includes('lining') ||
    p.includes('valence') || p.includes('valance') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple') || p.includes('american')
}

const CLAMP_OPTIONS = ['Ceiling Clamps', 'Single wall clamp', 'Double wall clamp']

const MANUAL_QUANTITY_MATERIALS = new Set([
  'bed back fabric',
  'bed border fabric',
  'bed back making',
  'soft board fabric',
  'soft board making',
  'seating fabric',
  'seating making',
  'pillow fabric',
  'pillow',
  'mattress',
  'wallpaper rolls',
  'wallpaper roll',
  'wallpaper pasting',
  'customised wallpaper',
  'customised wallpaper pasting',
  'carpet',
  'bed set',
  'bed sheet',
  'bedsheet',
  'bedsheets',
  'runner fabric',
  'matting',
  'mat',
  'pvc matting',
  'rod',
  'support',
  'end caps',
  'end cap',
  'shower curtain'
])

function isManualQuantityMaterial(productName) {
  if (!productName) return false
  const clean = String(productName).trim().toLowerCase()
  return MANUAL_QUANTITY_MATERIALS.has(clean)
}

function isHardwareProduct(productName) {
  if (!productName) return false
  const p = String(productName).toLowerCase().trim()
  if (p.includes('fabric') || p.includes('stitching')) return false
  return p === 'tracks' || p === 'track' ||
    p.includes('runner') ||
    p.includes('hook') ||
    p.includes('clamp') ||
    CLAMP_OPTIONS.some((c) => c.toLowerCase() === p)
}

function isSquareFootBlind(productName) {
  if (!productName) return false
  const p = String(productName).toLowerCase().trim()
  return p.includes('roller blind') ||
    p.includes('zebra blind') ||
    p.includes('wooden venetian blind') ||
    (p.includes('monsoon') && p.includes('blind'))
}

const RAW_STAFF_PRODUCTS = [
  'Tracks', 'Runners', 'Hooks', 'Ceiling clamps', 'Single wall clamps', 'Double wall clamps',
  'Ceiling Clamps', 'Single wall clamp', 'Double wall clamp',
  'American Stitching', 'Valence Stitching', 'Velance stitching', 'Roman blinds', 'Roller blinds',
  'Zebra blinds', 'Wooden Venetian blinds', 'Eyelet Stitching', 'Eyelet stitching', 'Ripple Stitching', 'Ripple stitching',
  'Bed back fabric', 'Bed border fabric', 'Bed back making',
  'Soft board fabric', 'Soft board making', 'Seating fabric', 'Seating making', 'Pillow fabric',
  'Pillow', 'Mattress', 'Wallpaper rolls', 'Wallpaper pasting', 'Customised wallpaper',
  'Customised wallpaper pasting', 'Carpet', 'Bed set', 'Bedsheets', 'Bed sheet', 'Runner fabric',
  'Runner stitching', 'Vinyl blinds', 'Monsoon blinds', 'Matting', 'Mat', 'PVC Matting',
  'Rod', 'Support', 'End caps', 'Shower curtain'
]

const PRODUCTS = [
  ...INDIVIDUAL_CURTAIN_PRODUCTS,
  ...RAW_STAFF_PRODUCTS
]
const AREA_OPTIONS = [
  'Foyer', 'Living room', 'Dining', 'Pooja room',
  ...Array.from({ length: 10 }, (_, index) => `Bedroom ${index + 1}`),
  'Guest room', "Parents room", "Grand parent's room", "Mother's room", "Father's room", "Son's room", "Daughter's room",
  ...Array.from({ length: 5 }, (_, index) => `Master bedroom ${index + 1}`),
  'Kitchen', 'Balcony', 'First floor living room', 'Second floor living room', 'Third floor living room', 'Home theatre', 'Entertainment room', 'Bar', 'Store room', 'Walk-in wardrobe', 'Bathroom', 'Staircase', 'Gym', 'Office',
  ...Array.from({ length: 10 }, (_, index) => `Cabin ${index + 1}`),
  'Reception area', 'Accounts area', 'HR area', 'Design area', 'Sales area', 'Purchase department', 'Conference room', "Owner's cabin", "Sir's cabin", 'Madams cabin', 'Library', 'Study area'
]

async function request(path, options = {}) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  const url = apiUrl(path)
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}) }
    })
  } catch (fetchError) {
    const error = new Error('Cannot reach the server. Please check your phone internet connection.')
    error.isNetwork = true
    throw error
  }
  if (response.status === 204) return {}
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return body
}

function queueEntries() {
  try {
    const stored = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function saveQueue(entries) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(entries))
}

function newMutationId() {
  return globalThis.crypto?.randomUUID?.() || 'sync-' + Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function isNetworkError(error) {
  return !error?.status && (error instanceof TypeError || /network|fetch|internet|failed|offline/i.test(String(error?.message || '')))
}

async function flushQueuedSubmissions() {
  const pending = queueEntries()
  const remaining = []
  let synced = 0
  for (const batch of pending) {
    try {
      if (batch.type === 'delete_submission') {
        await request('/staff/projects/' + encodeURIComponent(batch.projectId) + '/submissions/' + encodeURIComponent(batch.submissionId), {
          method: 'DELETE'
        })
        synced += 1
      } else {
        await request('/staff/projects/' + encodeURIComponent(batch.projectId) + '/submissions', {
          method: 'POST',
          body: JSON.stringify({ items: batch.items, mutationId: batch.mutationId })
        })
        synced += (batch.items || []).length
      }
    } catch (error) {
      remaining.push(batch)
      if (error.status === 401) throw error
      remaining.push(...pending.slice(pending.indexOf(batch) + 1))
      break
    }
  }
  saveQueue(remaining)
  return { synced, remaining: remaining.length }
}

function cachedProjects(staffId) {
  try {
    const stored = JSON.parse(localStorage.getItem('krishna-decor-staff-project-cache:' + staffId) || '[]')
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch {}
  try {
    const mgrProjects = JSON.parse(localStorage.getItem('krishna_decor_projects') || '[]')
    if (Array.isArray(mgrProjects) && mgrProjects.length > 0) return mgrProjects
  } catch {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('krishna-decor-staff-project-cache:')) {
        const stored = JSON.parse(localStorage.getItem(key) || '[]')
        if (Array.isArray(stored) && stored.length > 0) return stored
      }
    }
  } catch {}
  return []
}

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })
  const [projects, setProjects] = useState(() => {
    const stored = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })()
    const p = stored?.user?.id ? cachedProjects(stored.user.id) : cachedProjects('default')
    return p.length > 0 ? p : []
  })
  const [selectedId, setSelectedId] = useState(() => {
    const stored = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })()
    const p = stored?.user?.id ? cachedProjects(stored.user.id) : cachedProjects('default')
    return p[0]?.id || ''
  })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [pendingSyncCount, setPendingSyncCount] = useState(() => queueEntries().length)
  const [syncState, setSyncState] = useState(() => (typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : (queueEntries().length > 0 ? 'offline' : 'synced')))

  const loadProjects = async () => {
    try {
      const result = await request('/staff/projects')
      const nextProjects = result.projects || []
      setProjects(nextProjects)
      if (session?.user?.id) localStorage.setItem('krishna-decor-staff-project-cache:' + session.user.id, JSON.stringify(nextProjects))
      setSelectedId((current) => nextProjects.some((item) => item.id === current) ? current : (nextProjects[0]?.id || ''))
      if (syncState === 'offline' && queueEntries().length === 0) setSyncState('synced')
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(SESSION_KEY)
        setProjects([])
        setSession(null)
        setAuthMessage('Your session has expired. Please sign in again to load manager projects.')
      } else {
        if (isNetworkError(error)) {
          setSyncState('offline')
          setSelectedId((current) => current || (projects[0]?.id || ''))
        } else {
          setNotice(error.message)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const syncPending = async () => {
    if (!session) return
    const pending = queueEntries()
    setPendingSyncCount(pending.length)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline')
      return
    }
    setSyncState('syncing')
    try {
      const result = await flushQueuedSubmissions()
      setPendingSyncCount(result.remaining)
      if (result.synced) {
        await loadProjects()
        setNotice(result.synced + ' saved field item' + (result.synced === 1 ? '' : 's') + ' synchronized to the manager.')
      } else {
        await loadProjects()
      }
      setSyncState(result.remaining > 0 ? 'offline' : 'synced')
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
        setAuthMessage('Sign in again to synchronize saved field work.')
      } else {
        setSyncState('offline')
      }
    }
  }

  const handleCreateOfflineProject = () => {
    const newProj = {
      id: 'proj-offline-' + Date.now().toString(36),
      name: 'Site Project ' + new Date().toLocaleDateString('en-IN'),
      customer: { name: 'Customer name', location: 'Site location' },
      areas: [{ id: 'area-1', name: 'Living room' }],
      staffDrafts: [],
      quotations: []
    }
    setProjects((current) => {
      const next = [newProj, ...current]
      if (session?.user?.id) {
        localStorage.setItem('krishna-decor-staff-project-cache:' + session.user.id, JSON.stringify(next))
      }
      return next
    })
    setSelectedId(newProj.id)
    setNotice('Offline site project created. You can take measurements now.')
  }

  const handleLocalDraftsAdded = (projectId, pendingDrafts) => {
    setProjects((currentProjects) => {
      const updated = currentProjects.map((p) => {
        if (p.id !== projectId) return p
        return {
          ...p,
          staffDrafts: [...(p.staffDrafts || []), ...pendingDrafts]
        }
      })
      if (session?.user?.id) {
        localStorage.setItem('krishna-decor-staff-project-cache:' + session.user.id, JSON.stringify(updated))
      }
      return updated
    })
    setSyncState('offline')
  }

  const handleLocalDraftsUpdated = (projectId, nextDrafts) => {
    setProjects((currentProjects) => {
      const updated = currentProjects.map((p) => {
        if (p.id !== projectId) return p
        return {
          ...p,
          staffDrafts: nextDrafts
        }
      })
      if (session?.user?.id) {
        localStorage.setItem('krishna-decor-staff-project-cache:' + session.user.id, JSON.stringify(updated))
      }
      return updated
    })
  }

  useEffect(() => {
    if (!session) return undefined
    setLoading(true)
    loadProjects()
    syncPending()
    const onOnline = () => {
      setSyncState('syncing')
      syncPending()
    }
    const onOffline = () => setSyncState('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const interval = setInterval(() => {
      if (navigator.onLine) syncPending()
    }, 10000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(interval)
    }
  }, [session])

  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 3200); return () => clearTimeout(timer) } }, [notice])
  const authenticated = (next) => { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setAuthMessage(''); setSession(next) }
  const logout = async () => { try { await request('/auth/logout', { method: 'POST' }) } catch {} localStorage.removeItem(SESSION_KEY); setSession(null); setProjects([]) }
  if (!session) return <Login onAuthenticated={authenticated} message={authMessage} />
  if (loading) return <main className="staff-loading"><span>K</span><p>Loading manager projects…</p></main>
  const project = projects.find((item) => item.id === selectedId)

  return (
    <div className="staff-shell">
      <aside className="staff-side">
        <div className="staff-brand"><span>K</span><strong>KRISHNA <i>DECOR</i></strong></div>
        <p className="side-label">FIELD DESK</p>
        <div className="side-user">
          <span>{session.user.name.slice(0, 1)}</span>
          <div><strong>{session.user.name}</strong><small>Staff account</small></div>
          <button onClick={logout} title="Sign out"><LogOut size={15} /></button>
        </div>
        <p className="side-label projects-label">MANAGER PROJECTS</p>
        <div className="staff-projects">
          {projects.map((item) => (
            <button key={item.id} className={item.id === project?.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
              <span>{item.name.slice(0, 1)}</span>
              <div><strong>{item.name}</strong><small>{item.customer.name || 'Customer name pending'}</small></div>
            </button>
          ))}
        </div>
      </aside>
      <main className="staff-main">
        <header>
          <div>
            <p className="eyebrow">FIELD WORK</p>
            <h1>{project?.name || 'My field desk'}</h1>
          </div>
          <div className="header-project-controls">
            <button
              className={`sync-indicator-btn ${syncState}`}
              onClick={syncPending}
              title="Click to synchronize field work with manager"
            >
              <span className={`sync-dot ${syncState}`}></span>
              {syncState === 'syncing' ? (
                <>
                  <RefreshCw size={12} className="spin-anim" />
                  <span>Syncing…</span>
                </>
              ) : syncState === 'offline' ? (
                <span>Offline ({pendingSyncCount} pending)</span>
              ) : (
                <span>Online · Synced</span>
              )}
            </button>
            <label className="project-picker">
              <span>Select project</span>
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                <option value="">Choose a project</option>
                {projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
            </label>
            <button className="refresh-projects" onClick={() => { setLoading(true); loadProjects() }}>
              <RefreshCw size={13} />Refresh projects
            </button>
            {project && (
              <div className="site-meta">
                <MapPin size={16} />
                <span>{project.customer.location || project.customer.address || 'Site location pending'}</span>
              </div>
            )}
          </div>
        </header>
        {pendingSyncCount > 0 && (
          <div className="sync-banner">
            {pendingSyncCount} saved batch{pendingSyncCount === 1 ? '' : 'es'} stored locally on this phone · Auto-syncing when connected.
          </div>
        )}
        {project ? (
          <ProjectDesk
            key={project.id}
            project={project}
            staffId={session.user.id}
            staffName={session.user.name}
            onSaved={loadProjects}
            notify={setNotice}
            onQueued={(count) => setPendingSyncCount(count)}
            onLocalDraftsAdded={handleLocalDraftsAdded}
            onLocalDraftsUpdated={handleLocalDraftsUpdated}
          />
        ) : (
          <EmptyAssignments onNewOfflineProject={handleCreateOfflineProject} />
        )}
      </main>
      {notice && <div className="staff-notice"><CheckCircle2 size={17} />{notice}</div>}
    </div>
  )
}

function Login({ onAuthenticated, message }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [showServerConfig, setShowServerConfig] = useState(false)
  const [customServer, setCustomServer] = useState(() => apiBase())

  const login = async (event) => {
    event.preventDefault()
    setWaiting(true); setError('')
    try {
      const auth = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: usernameAlias(name), password, role: 'staff' })
      })
      localStorage.setItem('krishna-decor-staff-last-profile', JSON.stringify({ name: name.trim(), session: auth }))
      onAuthenticated(auth)
    } catch (requestError) {
      if (isNetworkError(requestError)) {
        try {
          const cached = JSON.parse(localStorage.getItem('krishna-decor-staff-last-profile') || 'null')
          if (cached && cached.name.toLowerCase() === name.trim().toLowerCase()) {
            onAuthenticated(cached.session)
            return
          }
        } catch {}
        // Offline staff sign-in fallback (e.g. for on-site measurement without internet)
        const staffNameTrimmed = name.trim()
        if (staffNameTrimmed && password && password.length >= 8) {
          const offlineSession = {
            token: 'offline-staff-token-' + Date.now(),
            user: {
              id: 'staff-offline-' + staffNameTrimmed.toLowerCase().replace(/[^a-z0-9]/g, ''),
              name: staffNameTrimmed,
              email: usernameAlias(staffNameTrimmed),
              role: 'staff'
            },
            offline: true
          }
          localStorage.setItem('krishna-decor-staff-last-profile', JSON.stringify({ name: staffNameTrimmed, session: offlineSession }))
          onAuthenticated(offlineSession)
          return
        }
      }
      setError(requestError.message)
    } finally {
      setWaiting(false)
    }
  }

  const handleSaveServer = (e) => {
    e.preventDefault()
    setApiBase(customServer)
    setShowServerConfig(false)
    setError('')
  }

  const handleResetServer = () => {
    clearApiBase()
    setCustomServer(DEFAULT_CLOUD_API_URL)
    setShowServerConfig(false)
    setError('')
  }

  return (
    <main className="staff-login">
      <section>
        <div className="staff-brand">
          <span>K</span>
          <strong>KRISHNA <i>DECOR</i></strong>
        </div>
        <p className="eyebrow">FIELD STAFF SIGN IN</p>
        <h1>Ready for the site.</h1>
        <p className="login-copy">
          Sign in with the name and password provided by your manager to select any manager project and save your field work.
        </p>
        <form onSubmit={login} autoComplete="off">
          <label>
            Staff name
            <input name="staff-login-name" value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Password
            <input name="staff-login-password" type="password" minLength="8" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
          </label>
          {(message || error) && (
            <div className="login-error-container">
              <p className="login-error">{error || message}</p>
            </div>
          )}
          <button disabled={waiting}>
            {waiting ? 'Signing in…' : 'Open field desk'}
            <ArrowUpRight size={17} />
          </button>
          <button
            type="button"
            className="connection-link"
            style={{ marginTop: '12px', background: 'none', border: 'none', color: '#0A4174', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', textAlign: 'center', width: '100%' }}
            onClick={() => setShowServerConfig(!showServerConfig)}
          >
            {showServerConfig ? 'Cancel server change' : 'Use a different data server'}
          </button>
          {showServerConfig && (
            <div style={{ marginTop: '10px', padding: '12px', background: '#eef6fa', borderRadius: '8px', textAlign: 'left', border: '1px solid #BDD8E9' }}>
              <label style={{ fontSize: '12px', color: '#001D39', display: 'block', marginBottom: '6px' }}>
                Server sync address
                <input
                  value={customServer}
                  onChange={(e) => setCustomServer(e.target.value)}
                  placeholder={DEFAULT_CLOUD_API_URL}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '4px', border: '1px solid #BDD8E9', background: '#fff', color: '#001D39', boxSizing: 'border-box' }}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={handleSaveServer} style={{ flex: 1, padding: '7px', background: '#0A4174', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Save server</button>
                <button type="button" onClick={handleResetServer} style={{ flex: 1, padding: '7px', background: '#ffffff', color: '#0A4174', border: '1px solid #BDD8E9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Reset default</button>
              </div>
            </div>
          )}
        </form>
      </section>
      <aside>
        <ClipboardPenLine size={34} />
        <h2>Add. Edit. Save.</h2>
        <p>Keep field entries in your cart until they are correct, then save them directly to the manager workspace and quotation flow.</p>
      </aside>
    </main>
  )
}

function ProjectDesk({ project, staffId, staffName, onSaved, notify, onQueued, onLocalDraftsAdded, onLocalDraftsUpdated }) {
  const emptyDraft = () => ({ area: '', width: '', height: '', unit: 'in', product: PRODUCTS[0], clampType: '', notes: '', quantity: '' })
  const cartKey = 'krishna-decor-staff-cart:' + staffId + ':' + project.id
  const [draft, setDraft] = useState(emptyDraft)
  const [cart, setCart] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(cartKey) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch { return [] }
  })
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const additionalProjectAreas = project.areas.map((area) => area.name).filter((name) => name && !AREA_OPTIONS.includes(name))
  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(cart)) }, [cart, cartKey])

  const addToCart = (event) => {
    event.preventDefault()
    const isCurtain = isCurtainProduct(draft.product)
    const isManual = isManualQuantityMaterial(draft.product)
    const isBlind = isSquareFootBlind(draft.product) || draft.product === 'Roman blinds'
    const mountText = draft.clampType ? ' · Mounting: ' + draft.clampType : ''
    const item = {
      ...draft,
      quantity: draft.quantity !== undefined && draft.quantity !== '' ? Number(draft.quantity) : 0,
      unitPrice: 0,
      isManualQuantity: isManual,
      minimumArea: isBlind ? (draft.minimumArea || '11') : undefined,
      width: draft.width !== '' && draft.width !== undefined && draft.width !== null ? Number(draft.width) : 0,
      height: draft.height !== '' && draft.height !== undefined && draft.height !== null ? Number(draft.height) : 0,
      notes: (draft.notes || '') + (draft.clampType && !draft.notes?.includes(draft.clampType) ? (draft.notes ? mountText : 'Mounting: ' + draft.clampType) : ''),
      clampType: isCurtain ? (draft.clampType || '') : '',
      curtainSetId: isCurtain ? (draft.curtainSetId || ('curtain-set-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6))) : '',
      localId: editingId || 'cart-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    }
    setCart((items) => editingId ? items.map((entry) => entry.localId === editingId ? item : entry) : [...items, item])
    setEditingId('')
    setDraft(emptyDraft())
    notify(editingId ? 'Cart item updated.' : 'Added to cart. You can edit it before saving.')
  }

  const editCartItem = (item) => {
    setEditingId(item.localId)
    const isManual = isManualQuantityMaterial(item.product) || Boolean(item.isManualQuantity)
    setDraft({
      area: item.area,
      width: Number(item.width) > 0 ? item.width : (isManual ? '' : item.width || ''),
      height: Number(item.height) > 0 ? item.height : (isManual ? '' : item.height || ''),
      unit: item.unit || 'in',
      product: item.product,
      clampType: item.clampType || '',
      notes: item.notes || '',
      quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? String(item.quantity) : '',
      minimumArea: item.minimumArea || '11'
    })
    document.querySelector('.measurement-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const removeCartItem = (id) => {
    setCart((items) => items.filter((item) => item.localId !== id))
    if (editingId === id) { setEditingId(''); setDraft(emptyDraft()) }
  }

  const saveCart = async () => {
    if (!cart.length) return
    setSaving(true)
    const mutationId = newMutationId()
    const items = cart.map(({ localId, ...item }) => item)
    try {
      await request('/staff/projects/' + project.id + '/submissions', { method: 'POST', body: JSON.stringify({ items, mutationId }) })
      localStorage.removeItem(cartKey)
      setCart([])
      await onSaved()
      notify(cart.length + ' cart item' + (cart.length === 1 ? '' : 's') + ' saved to the manager and quotation flow.')
    } catch (error) {
      if (isNetworkError(error)) {
        const nextQueue = [...queueEntries(), { mutationId, projectId: project.id, items, createdAt: new Date().toISOString() }]
        saveQueue(nextQueue)
        onQueued(nextQueue.length)
        localStorage.removeItem(cartKey)
        setCart([])
        const pendingDrafts = items.map((item, idx) => ({
          id: 'draft-' + Date.now().toString(36) + '-' + idx,
          area: item.area,
          width: item.width,
          height: item.height,
          unit: item.unit,
          product: item.product,
          quantity: item.quantity !== undefined ? Number(item.quantity) : 0,
          unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : 0,
          isManualQuantity: isManualQuantityMaterial(item.product) || Boolean(item.isManualQuantity),
          notes: item.notes || '',
          clampType: item.clampType || '',
          curtainSetId: item.curtainSetId || '',
          curtainSystem: item.curtainSystem || '',
          staffId,
          staffName: staffName || 'Staff',
          status: 'Pending sync',
          createdAt: new Date().toISOString()
        }))
        onLocalDraftsAdded?.(project.id, pendingDrafts)
        notify(cart.length + ' cart item' + (cart.length === 1 ? '' : 's') + ' saved locally on this phone. They will synchronize automatically.')
      } else {
        notify(error.message)
      }
    } finally {
      setSaving(false)
    }
  }



  const isCurtainSelected = isCurtainProduct(draft.product)
  const isManualMaterial = isManualQuantityMaterial(draft.product)
  const isHardwareSelected = isHardwareProduct(draft.product)
  const isBlindSelected = isSquareFootBlind(draft.product) || draft.product === 'Roman blinds'

  return (
    <div className="desk-grid">
      <section className="field-panel">
        <div className="section-top">
          <div>
            <p className="eyebrow">01 / CART ITEM</p>
            <h2>{editingId ? 'Edit cart item' : 'Capture a measurement'}</h2>
          </div>
          <Ruler size={21} />
        </div>
        <form onSubmit={addToCart} className="measurement-form">
          <label>
            Area
            <select required value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}>
              <option value="" disabled>Select an area</option>
              <optgroup label="Standard areas">{AREA_OPTIONS.map((area) => <option key={area}>{area}</option>)}</optgroup>
              {additionalProjectAreas.length ? <optgroup label="Project-specific areas">{additionalProjectAreas.map((area) => <option key={area}>{area}</option>)}</optgroup> : null}
            </select>
          </label>

          <label>
            Product / material
            <select
              value={draft.product}
              onChange={(event) => {
                const nextProduct = event.target.value
                const isCurtain = isCurtainProduct(nextProduct)
                const isManual = isManualQuantityMaterial(nextProduct)
                setDraft({
                  ...draft,
                  product: nextProduct,
                  clampType: isCurtain ? draft.clampType : '',
                  quantity: isManual ? (draft.quantity !== undefined ? draft.quantity : '') : draft.quantity
                })
              }}
            >
              {PRODUCTS.map((product) => <option key={product}>{product}</option>)}
            </select>
          </label>

          {isBlindSelected && (
            <label>
              Minimum chargeable area
              <select value={draft.minimumArea || '11'} onChange={(event) => setDraft({ ...draft, minimumArea: event.target.value })}>
                <option value="11">11 sq ft (Standard)</option>
                <option value="16.5">16.5 sq ft</option>
              </select>
            </label>
          )}

          {isManualMaterial && (
            <div className="manual-quantity-card">
              <div className="manual-quantity-card-head">
                <span>Quantity <strong className="required-star">*</strong></span>
                <small className="label-hint">Manual count · default: 0</small>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                required
                value={draft.quantity ?? ''}
                onFocus={(e) => e.target.select?.()}
                onWheel={(e) => e.target.blur()}
                onChange={(event) => {
                  setDraft({ ...draft, quantity: event.target.value })
                }}
                placeholder="0"
              />
            </div>
          )}

          <div className="measure-row">
            <label>
              Width {isManualMaterial && <small>(optional)</small>}
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required={!isManualMaterial}
                placeholder={isManualMaterial ? 'Optional' : ''}
                value={draft.width}
                onFocus={(e) => e.target.select?.()}
                onWheel={(e) => e.target.blur()}
                onChange={(event) => setDraft({ ...draft, width: event.target.value })}
              />
            </label>
            <span>×</span>
            <label>
              Height {isManualMaterial ? <small>(optional)</small> : isHardwareSelected ? <small>(not needed)</small> : null}
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required={!isManualMaterial && !isHardwareSelected}
                placeholder={isManualMaterial ? 'Optional' : isHardwareSelected ? 'Not needed' : ''}
                value={draft.height}
                onFocus={(e) => e.target.select?.()}
                onWheel={(e) => e.target.blur()}
                onChange={(event) => setDraft({ ...draft, height: event.target.value })}
              />
            </label>
            <label>
              Unit
              <select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>
                <option value="in">Inches</option>
                <option value="ft">Feet</option>
                <option value="m">Metres</option>
                <option value="cm">Centimetres</option>
              </select>
            </label>
          </div>

          {isCurtainSelected && (
            <label>
              Mounting clamp <small>(optional)</small>
              <select value={draft.clampType || ''} onChange={(event) => setDraft({ ...draft, clampType: event.target.value })}>
                <option value="">Select a clamp type (Optional)</option>
                {CLAMP_OPTIONS.map((clamp) => <option key={clamp} value={clamp}>{clamp}</option>)}
              </select>
            </label>
          )}

          <label>
            Site notes <small>(optional)</small>
            <textarea
              rows="4"
              value={draft.notes}
              placeholder="Add a detail the manager should know"
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </label>

          <div className="cart-form-actions">
            <button className="submit-draft">
              {editingId ? 'Update cart item' : (isCurtainSelected ? 'Add curtain to cart' : 'Add to cart')}
              <ShoppingCart size={16} />
            </button>
            {editingId && (
              <button type="button" className="cancel-edit" onClick={() => { setEditingId(''); setDraft(emptyDraft()) }}>
                <X size={15} />Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="draft-panel cart-panel">
        <div className="section-top">
          <div>
            <p className="eyebrow">02 / CART</p>
            <h2>Ready to save</h2>
          </div>
          <span className="draft-count">{cart.length}</span>
        </div>
        {cart.length ? (
          <>
            <div className="draft-list cart-list">
              {cart.map((item) => {
                const isManual = isManualQuantityMaterial(item.product) || Boolean(item.isManualQuantity)
                const isHardware = isHardwareProduct(item.product)
                const hasDims = Number(item.width) > 0 && (isHardware || Number(item.height) > 0)
                const dimStr = hasDims ? (isHardware ? `Width: ${item.width} ${item.unit}` : `${item.width} × ${item.height} ${item.unit}`) : ''
                const qtyStr = isManual ? `Qty: ${item.quantity ?? 0}` : ''
                const minAreaStr = item.minimumArea ? `Min. ${item.minimumArea} sq ft` : ''
                const detailsStr = [qtyStr, dimStr, minAreaStr, item.notes].filter(Boolean).join(' · ')
                return (
                  <article key={item.localId}>
                    <span className="draft-icon"><Package size={16} /></span>
                    <div>
                      <strong>{item.area} / {item.product}</strong>
                      <p>{detailsStr || `${item.width || 0} × ${item.height || 0} ${item.unit}`}</p>
                      <small>Not yet saved to the manager</small>
                    </div>
                    <div className="cart-item-actions">
                      <button onClick={() => editCartItem(item)} title="Edit cart item"><Pencil size={14} /></button>
                      <button onClick={() => removeCartItem(item.localId)} title="Remove cart item"><Trash2 size={14} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
            <button className="save-cart" onClick={saveCart} disabled={saving}>
              {saving ? 'Saving cart…' : 'Save ' + cart.length + ' item' + (cart.length === 1 ? '' : 's') + ' to manager'}
              <Save size={16} />
            </button>
          </>
        ) : (
          <div className="no-drafts">
            <ShoppingCart size={25} />
            <p>Add one or more entries to your cart, then save them together when ready.</p>
          </div>
        )}

        <div className="saved-submissions">
          <div className="saved-submissions-head">
            <p className="eyebrow">SAVED TO MANAGER</p>
            <span>{project.staffDrafts?.length || 0}</span>
          </div>
          {project.staffDrafts?.length ? (
            <div className="draft-list">
              {project.staffDrafts.slice().reverse().map((item) => {
                const isManual = isManualQuantityMaterial(item.product) || Boolean(item.isManualQuantity)
                const isHardware = isHardwareProduct(item.product)
                const hasDims = Number(item.width) > 0 && (isHardware || Number(item.height) > 0)
                const dimStr = hasDims ? (isHardware ? `Width: ${item.width} ${item.unit}` : `${item.width} × ${item.height} ${item.unit}`) : ''
                const qtyStr = isManual ? `Qty: ${item.quantity ?? 0}` : ''
                const minAreaStr = item.minimumArea ? `Min. ${item.minimumArea} sq ft` : ''
                const detailsStr = [qtyStr, dimStr, minAreaStr, item.notes].filter(Boolean).join(' · ')
                return (
                  <article key={item.id}>
                    <span className="draft-icon"><CheckCircle2 size={16} /></span>
                    <div>
                      <strong>{item.area} / {item.product}</strong>
                      <p>{detailsStr || `${item.width || 0} × ${item.height || 0} ${item.unit}`}</p>
                      <small>Saved {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                    </div>
                    <div className="saved-item-side">
                      <em>{item.status === 'Pending review' ? 'Saved' : item.status}</em>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="saved-empty">Saved cart items will be visible here and on the manager dashboard.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyAssignments({ onNewOfflineProject }) {
  return (
    <section className="empty-assignments">
      <span><Package size={29} /></span>
      <p className="eyebrow">NO PROJECTS YET</p>
      <h2>No project selected or loaded.</h2>
      <p>Projects created in the manager app automatically appear in the project dropdown. If you are offline at a new site, you can create a site project directly.</p>
      {onNewOfflineProject && (
        <button
          type="button"
          className="create-offline-proj-btn"
          style={{ marginTop: '16px', padding: '10px 18px', background: '#0A4174', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          onClick={onNewOfflineProject}
        >
          + Create offline site project
        </button>
      )}
    </section>
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('wheel', () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur()
    }
  }, { passive: true })
}

createRoot(document.getElementById('root')).render(<App />)
