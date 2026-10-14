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
const CURTAIN_SYSTEMS = [
  {
    id: 'american',
    name: 'American curtains',
    products: ['American main curtain', 'American sheer', 'American lining']
  },
  {
    id: 'valence',
    name: 'Valence curtains',
    products: ['Valence main curtain', 'Valence sheer', 'Valence lining']
  },
  {
    id: 'eyelet',
    name: 'Eylet curtains',
    products: ['Eylet main curtain', 'Eylet sheer', 'Eylet lining']
  },
  {
    id: 'ripple',
    name: 'Ripple curtains',
    products: ['Ripple main curtain', 'Ripple sheer', 'Ripple lining']
  }
]

const CLAMP_OPTIONS = ['Ceiling Clamps', 'Single wall clamp', 'Double wall clamp']

const RAW_STAFF_PRODUCTS = [
  'Velance Fabric', 'American Stitching', 'Velance stitching', 'Roman blinds', 'Roller blinds',
  'Zebra blinds', 'Wooden Venetian blinds', 'Eyelet stitching', 'Ripple stitching',
  'Installation', 'Delivery', 'Bed back fabric', 'Bed border fabric', 'Bed back making',
  'Soft board fabric', 'Soft board making', 'Seating fabric', 'Seating making', 'Pillow fabric',
  'Pillow', 'Mattress', 'Wallpaper rolls', 'Wallpaper pasting', 'Customised wallpaper',
  'Customised wallpaper pasting', 'Carpet', 'Bed set', 'Bedsheets', 'Runner fabric',
  'Runner stitching', 'Vinyl blinds', 'Monsoon blinds', 'Matting', 'Mat', 'PVC Matting',
  'Rod', 'Support', 'End caps', 'Shower curtain'
]

const PRODUCTS = [
  ...CURTAIN_SYSTEMS.map((system) => system.name),
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
  return !error?.status && (error instanceof TypeError || /network|fetch|internet|failed/i.test(String(error?.message || '')))
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
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })
  const [projects, setProjects] = useState(() => {
    const stored = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })()
    return stored?.user?.id ? cachedProjects(stored.user.id) : []
  })
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(Boolean(session))
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
          <EmptyAssignments />
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
            style={{ marginTop: '12px', background: 'none', border: 'none', color: '#173e73', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', textAlign: 'center', width: '100%' }}
            onClick={() => setShowServerConfig(!showServerConfig)}
          >
            {showServerConfig ? 'Cancel server change' : 'Use a different data server'}
          </button>
          {showServerConfig && (
            <div style={{ marginTop: '10px', padding: '12px', background: '#f5f7fa', borderRadius: '8px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px' }}>
                Server sync address
                <input
                  value={customServer}
                  onChange={(e) => setCustomServer(e.target.value)}
                  placeholder={DEFAULT_CLOUD_API_URL}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={handleSaveServer} style={{ flex: 1, padding: '7px', background: '#173e73', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Save server</button>
                <button type="button" onClick={handleResetServer} style={{ flex: 1, padding: '7px', background: '#eee', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Reset default</button>
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
  const emptyDraft = () => ({ area: '', width: '', height: '', unit: 'in', product: PRODUCTS[0], clampType: '', notes: '' })
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
    const curtainSystem = CURTAIN_SYSTEMS.find((sys) => sys.name === draft.product)
    if (curtainSystem && !editingId) {
      const curtainSetId = 'curtain-set-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      const mountText = draft.clampType ? ' · Mounting: ' + draft.clampType : ''
      const itemsToAdd = curtainSystem.products.map((compName) => ({
        localId: 'cart-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        area: draft.area,
        width: draft.width,
        height: draft.height,
        unit: draft.unit,
        product: compName,
        notes: (draft.notes ? draft.notes + mountText : (draft.clampType ? 'Mounting: ' + draft.clampType : '')),
        clampType: draft.clampType || '',
        curtainSetId,
        curtainSystem: curtainSystem.id
      }))
      setCart((items) => [...items, ...itemsToAdd])
      setDraft(emptyDraft())
      notify(`${curtainSystem.name} added with main curtain, sheer and lining.`)
      return
    }

    const item = { ...draft, localId: editingId || 'cart-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
    setCart((items) => editingId ? items.map((entry) => entry.localId === editingId ? item : entry) : [...items, item])
    setEditingId('')
    setDraft(emptyDraft())
    notify(editingId ? 'Cart item updated.' : 'Added to cart. You can edit it before saving.')
  }
  const editCartItem = (item) => {
    setEditingId(item.localId)
    setDraft({
      area: item.area,
      width: item.width,
      height: item.height,
      unit: item.unit,
      product: PRODUCTS.includes(item.product) ? item.product : (CURTAIN_SYSTEMS.find(s => s.products.includes(item.product))?.name || item.product),
      clampType: item.clampType || '',
      notes: item.notes || ''
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
  const deleteSavedSubmission = async (submissionId) => {
    const rawId = String(submissionId || '').replace(/^staff-/, '')
    const nextDrafts = (project.staffDrafts || []).filter((s) => {
      const sId = String(s.id || s.rawId || s.localId || '').replace(/^staff-/, '')
      return sId !== rawId && String(s.id) !== String(submissionId)
    })
    onLocalDraftsUpdated?.(project.id, nextDrafts)
    notify('Saved field submission deleted.')
    try {
      await request('/staff/projects/' + project.id + '/submissions/' + encodeURIComponent(rawId), {
        method: 'DELETE'
      })
    } catch (error) {
      if (isNetworkError(error)) {
        const nextQueue = [...queueEntries(), {
          type: 'delete_submission',
          projectId: project.id,
          submissionId: rawId,
          createdAt: new Date().toISOString()
        }]
        saveQueue(nextQueue)
        onQueued?.(nextQueue.length)
      } else {
        notify(error.message || 'Could not delete submission.')
      }
    }
  }

  const isCurtainSelected = CURTAIN_SYSTEMS.some((sys) => sys.name === draft.product)
  return <div className="desk-grid"><section className="field-panel"><div className="section-top"><div><p className="eyebrow">01 / CART ITEM</p><h2>{editingId ? 'Edit cart item' : 'Capture a measurement'}</h2></div><Ruler size={21} /></div><form onSubmit={addToCart} className="measurement-form"><label>Area<select required value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}><option value="" disabled>Select an area</option><optgroup label="Standard areas">{AREA_OPTIONS.map((area) => <option key={area}>{area}</option>)}</optgroup>{additionalProjectAreas.length ? <optgroup label="Project-specific areas">{additionalProjectAreas.map((area) => <option key={area}>{area}</option>)}</optgroup> : null}</select></label><div className="measure-row"><label>Width<input required type="number" min="0.01" step="0.01" value={draft.width} onChange={(event) => setDraft({ ...draft, width: event.target.value })} /></label><span>×</span><label>Height<input required type="number" min="0.01" step="0.01" value={draft.height} onChange={(event) => setDraft({ ...draft, height: event.target.value })} /></label><label>Unit<select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}><option value="in">Inches</option><option value="ft">Feet</option><option value="m">Metres</option><option value="cm">Centimetres</option></select></label></div><label>Product / material<select value={draft.product} onChange={(event) => { const nextProduct = event.target.value; const isCurtain = CURTAIN_SYSTEMS.some((sys) => sys.name === nextProduct); setDraft({ ...draft, product: nextProduct, clampType: isCurtain ? draft.clampType : '' }) }}>{PRODUCTS.map((product) => <option key={product}>{product}</option>)}</select></label>{isCurtainSelected && <label>Mounting clamp <small>(optional)</small><select value={draft.clampType || ''} onChange={(event) => setDraft({ ...draft, clampType: event.target.value })}><option value="">Select a clamp type (Optional)</option>{CLAMP_OPTIONS.map((clamp) => <option key={clamp} value={clamp}>{clamp}</option>)}</select></label>}<label>Site notes <small>(optional)</small><textarea rows="4" value={draft.notes} placeholder="Add a detail the manager should know" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label><div className="cart-form-actions"><button className="submit-draft">{editingId ? 'Update cart item' : (isCurtainSelected ? 'Add curtain set to cart' : 'Add to cart')}<ShoppingCart size={16} /></button>{editingId && <button type="button" className="cancel-edit" onClick={() => { setEditingId(''); setDraft(emptyDraft()) }}><X size={15} />Cancel</button>}</div></form></section><section className="draft-panel cart-panel"><div className="section-top"><div><p className="eyebrow">02 / CART</p><h2>Ready to save</h2></div><span className="draft-count">{cart.length}</span></div>{cart.length ? <><div className="draft-list cart-list">{cart.map((item) => <article key={item.localId}><span className="draft-icon"><Package size={16} /></span><div><strong>{item.area} / {item.product}</strong><p>{item.width} × {item.height} {item.unit} {item.notes ? '· ' + item.notes : ''}</p><small>Not yet saved to the manager</small></div><div className="cart-item-actions"><button onClick={() => editCartItem(item)} title="Edit cart item"><Pencil size={14} /></button><button onClick={() => removeCartItem(item.localId)} title="Remove cart item"><Trash2 size={14} /></button></div></article>)}</div><button className="save-cart" onClick={saveCart} disabled={saving}>{saving ? 'Saving cart…' : 'Save ' + cart.length + ' item' + (cart.length === 1 ? '' : 's') + ' to manager'}<Save size={16} /></button></> : <div className="no-drafts"><ShoppingCart size={25} /><p>Add one or more entries to your cart, then save them together when ready.</p></div>}<div className="saved-submissions"><div className="saved-submissions-head"><p className="eyebrow">SAVED TO MANAGER</p><span>{project.staffDrafts?.length || 0}</span></div>{project.staffDrafts?.length ? <div className="draft-list">{project.staffDrafts.slice().reverse().map((item) => <article key={item.id}><span className="draft-icon"><CheckCircle2 size={16} /></span><div><strong>{item.area} / {item.product}</strong><p>{item.width} × {item.height} {item.unit} {item.notes ? '· ' + item.notes : ''}</p><small>Saved {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><div className="saved-item-side"><em>{item.status === 'Pending review' ? 'Saved' : item.status}</em><button type="button" className="delete-submission-btn" onClick={() => deleteSavedSubmission(item.id)} title="Delete saved submission" aria-label="Delete saved submission"><Trash2 size={13} /></button></div></article>)}</div> : <p className="saved-empty">Saved cart items will be visible here and on the manager dashboard.</p>}</div></section></div>
}

function EmptyAssignments() {
  return <section className="empty-assignments"><span><Package size={29} /></span><p className="eyebrow">NO PROJECTS YET</p><h2>No project has been created.</h2><p>Projects created in the manager app automatically appear in the project dropdown.</p></section>
}

createRoot(document.getElementById('root')).render(<App />)
