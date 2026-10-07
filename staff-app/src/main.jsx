import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, CheckCircle2, ClipboardPenLine, LogOut, MapPin, Package, Pencil, RefreshCw, Ruler, Save, ShoppingCart, Trash2, X } from 'lucide-react'
import './styles.css'
import { apiBase, apiUrl, canConfigureApiBase, clearApiBase, isApiConfigured, setApiBase } from './api-config.js'

const SESSION_KEY = 'krishna-decor-staff-session'
const SYNC_QUEUE_KEY = 'krishna-decor-staff-submission-queue'
const usernameAlias = (name) => {
  const localPart = String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 60) || 'user'
  return localPart + '@krishnadecor.local'
}
const PRODUCTS = ['American main curtains', 'American sheer curtains', 'American lining', 'Velance Fabric', 'American Stitching', 'Velance stitching', 'Roman blinds', 'Roller blinds', 'Zebra blinds', 'Wooden Venetian blinds', 'Eyelet Main curtains', 'Eyelet sheer curtains', 'Eyelet lining', 'Eyelet stitching', 'Ripple Main curtains', 'Ripple sheer curtain', 'Ripple lining', 'Ripple stitching', 'Track', 'Runners', 'Ceiling Clamps', 'Single wall clamp', 'Double wall clamp', 'Hooks', 'Installation', 'Delivery', 'Bed back fabric', 'Bed border fabric', 'Bed back making', 'Soft board fabric', 'Soft board making', 'Seating fabric', 'Seating making', 'Pillow fabric', 'Pillow', 'Mattress', 'Wallpaper rolls', 'Wallpaper pasting', 'Customised wallpaper', 'Customised wallpaper pasting', 'Carpet', 'Bed set', 'Bedsheets', 'Runner fabric', 'Runner stitching', 'Vinyl blinds', 'Monsoon blinds', 'Matting', 'Mat', 'PVC Matting', 'Rod', 'Support', 'End caps', 'Shower curtain']
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
    const error = new Error('Cannot reach ' + apiBase() + '. Check phone internet or tap "Use a different data server" below.')
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
      await request('/staff/projects/' + encodeURIComponent(batch.projectId) + '/submissions', {
        method: 'POST',
        body: JSON.stringify({ items: batch.items, mutationId: batch.mutationId })
      })
      synced += batch.items.length
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
  const [connectionReady, setConnectionReady] = useState(() => isApiConfigured())
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
  const loadProjects = async () => {
    try {
      const result = await request('/staff/projects')
      const nextProjects = result.projects || []
      setProjects(nextProjects)
      if (session?.user?.id) localStorage.setItem('krishna-decor-staff-project-cache:' + session.user.id, JSON.stringify(nextProjects))
      setSelectedId((current) => nextProjects.some((item) => item.id === current) ? current : (nextProjects[0]?.id || ''))
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(SESSION_KEY)
        setProjects([])
        setSession(null)
        setAuthMessage('Your session has expired. Please sign in again to load manager projects.')
      } else {
        setNotice(error.message)
      }
    } finally {
      setLoading(false)
    }
  }
  const syncPending = async () => {
    if (!session || !navigator.onLine) return
    try {
      const result = await flushQueuedSubmissions()
      setPendingSyncCount(result.remaining)
      if (result.synced) {
        await loadProjects()
        setNotice(result.synced + ' saved field item' + (result.synced === 1 ? '' : 's') + ' synchronized to the manager.')
      }
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
        setAuthMessage('Sign in again to synchronize saved field work.')
      }
    }
  }
  useEffect(() => {
    if (!session) return undefined
    setLoading(true)
    loadProjects()
    syncPending()
    const onOnline = () => syncPending()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [session])
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 3200); return () => clearTimeout(timer) } }, [notice])
  const authenticated = (next) => { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setAuthMessage(''); setSession(next) }
  const logout = async () => { try { await request('/auth/logout', { method: 'POST' }) } catch {} localStorage.removeItem(SESSION_KEY); setSession(null); setProjects([]) }
  const configureConnection = () => { clearApiBase(); localStorage.removeItem(SESSION_KEY); setSession(null); setProjects([]); setConnectionReady(false) }
  if (!connectionReady) return <ConnectionSetup role="Staff" onConnected={() => setConnectionReady(true)} />
  if (!session) return <Login onAuthenticated={authenticated} message={authMessage} onConfigure={canConfigureApiBase() ? configureConnection : null} />
  if (loading) return <main className="staff-loading"><span>K</span><p>Loading manager projects…</p></main>
  const project = projects.find((item) => item.id === selectedId)
  return <div className="staff-shell"><aside className="staff-side"><div className="staff-brand"><span>K</span><strong>KRISHNA <i>DECOR</i></strong></div><p className="side-label">FIELD DESK</p><div className="side-user"><span>{session.user.name.slice(0, 1)}</span><div><strong>{session.user.name}</strong><small>Staff account</small></div><button onClick={logout} title="Sign out"><LogOut size={15} /></button></div><p className="side-label projects-label">MANAGER PROJECTS</p><div className="staff-projects">{projects.map((item) => <button key={item.id} className={item.id === project?.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span>{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.customer.name || 'Customer name pending'}</small></div></button>)}</div></aside><main className="staff-main"><header><div><p className="eyebrow">FIELD WORK</p><h1>{project?.name || 'My field desk'}</h1></div><div className="header-project-controls"><label className="project-picker"><span>Select project</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Choose a project</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button className="refresh-projects" onClick={() => { setLoading(true); loadProjects() }}><RefreshCw size={13} />Refresh projects</button>{project && <div className="site-meta"><MapPin size={16} /><span>{project.customer.location || project.customer.address || 'Site location pending'}</span></div>}</div></header>{pendingSyncCount > 0 && <div className="sync-banner">{pendingSyncCount} saved batch{pendingSyncCount === 1 ? '' : 'es'} waiting to synchronize.</div>}{project ? <ProjectDesk key={project.id} project={project} staffId={session.user.id} onSaved={loadProjects} notify={setNotice} onQueued={(count) => setPendingSyncCount(count)} /> : <EmptyAssignments />}</main>{notice && <div className="staff-notice"><CheckCircle2 size={17} />{notice}</div>}</div>
}

function ConnectionSetup({ role, onConnected }) {
  const [address, setAddress] = useState(() => apiBase())
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const connectWithUrl = async (targetUrl) => {
    setTesting(true)
    setError('')
    try {
      const base = setApiBase(targetUrl)
      const response = await fetch(base + '/health')
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.ok) throw new Error(body.error || 'The data server did not respond.')
      onConnected()
    } catch (connectionError) {
      setError(connectionError.message || 'Could not connect to that data server.')
    } finally {
      setTesting(false)
    }
  }
  const connect = (event) => {
    event.preventDefault()
    connectWithUrl(address)
  }
  return <main className="connection-screen"><section className="connection-card"><div className="staff-brand"><span>K</span><strong>KRISHNA <i>DECOR</i></strong></div><p className="eyebrow">{role.toUpperCase()} APP SETUP</p><h1>Connect to your workspace</h1><p>The apps synchronize automatically with the 24/7 cloud backend. You can also specify a custom address below.</p><form onSubmit={connect}><button type="button" className="preset-cloud-btn" onClick={() => { setAddress('https://krishna-decor-api.onrender.com/api'); connectWithUrl('https://krishna-decor-api.onrender.com/api'); }}>Connect to 24/7 Cloud (Render + Neon)</button><label>Custom Sync address<input value={address} placeholder="https://krishna-decor-api.onrender.com/api" autoCapitalize="none" autoCorrect="off" inputMode="url" onChange={(event) => setAddress(event.target.value)} /></label>{error && <p className="login-error">{error}</p>}<button disabled={testing}>{testing ? 'Checking connection…' : 'Save & Connect'}<ArrowUpRight size={17} /></button></form><small>Default: <code>https://krishna-decor-api.onrender.com/api</code></small></section></main>
}

function Login({ onAuthenticated, message, onConfigure }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState(false)
  const currentServer = apiBase()
  const isCloud = currentServer.includes('krishna-decor-api.onrender.com')

  const resetToCloud = () => {
    clearApiBase()
    setError('')
    window.location.reload()
  }

  const login = async (event) => {
    event.preventDefault()
    setWaiting(true); setError('')
    try { onAuthenticated(await request('/auth/login', { method: 'POST', body: JSON.stringify({ name: name.trim(), email: usernameAlias(name), password, role: 'staff' }) })) } catch (requestError) { setError(requestError.message) } finally { setWaiting(false) }
  }
  return <main className="staff-login"><section><div className="staff-brand"><span>K</span><strong>KRISHNA <i>DECOR</i></strong></div><p className="eyebrow">FIELD STAFF SIGN IN</p><h1>Ready for the site.</h1><p className="login-copy">Sign in with the name and password provided by your manager to select any manager project and save your field work.</p><div className="server-status-badge"><span className="server-dot"></span><span>Sync: {isCloud ? '24/7 Cloud' : 'Custom'}</span><code>{currentServer}</code></div><form onSubmit={login} autoComplete="off"><label>Staff name<input name="staff-login-name" value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} /></label><label>Password<input name="staff-login-password" type="password" minLength="8" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} /></label>{(message || error) && <div className="login-error-container"><p className="login-error">{error || message}</p>{(!isCloud || /reach|connect|failed/i.test(error || message)) && <button type="button" className="switch-cloud-btn" onClick={resetToCloud}>Reset to 24/7 Cloud Server</button>}</div>}<button disabled={waiting}>{waiting ? 'Signing in…' : 'Open field desk'}<ArrowUpRight size={17} /></button></form>{onConfigure && <button className="connection-link" onClick={onConfigure}>Use a different data server</button>}</section><aside><ClipboardPenLine size={34} /><h2>Add. Edit. Save.</h2><p>Keep field entries in your cart until they are correct, then save them directly to the manager workspace and quotation flow.</p></aside></main>
}

function ProjectDesk({ project, staffId, onSaved, notify, onQueued }) {
  const emptyDraft = () => ({ area: '', width: '', height: '', unit: 'in', product: PRODUCTS[0], notes: '' })
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
    const item = { ...draft, localId: editingId || 'cart-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
    setCart((items) => editingId ? items.map((entry) => entry.localId === editingId ? item : entry) : [...items, item])
    setEditingId('')
    setDraft(emptyDraft())
    notify(editingId ? 'Cart item updated.' : 'Added to cart. You can edit it before saving.')
  }
  const editCartItem = (item) => {
    setEditingId(item.localId)
    setDraft({ area: item.area, width: item.width, height: item.height, unit: item.unit, product: item.product, notes: item.notes || '' })
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
        notify(cart.length + ' cart item' + (cart.length === 1 ? '' : 's') + ' saved on this phone. They will synchronize automatically.')
      } else {
        notify(error.message)
      }
    } finally {
      setSaving(false)
    }
  }
  return <div className="desk-grid"><section className="field-panel"><div className="section-top"><div><p className="eyebrow">01 / CART ITEM</p><h2>{editingId ? 'Edit cart item' : 'Capture a measurement'}</h2></div><Ruler size={21} /></div><form onSubmit={addToCart} className="measurement-form"><label>Area<select required value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}><option value="" disabled>Select an area</option><optgroup label="Standard areas">{AREA_OPTIONS.map((area) => <option key={area}>{area}</option>)}</optgroup>{additionalProjectAreas.length ? <optgroup label="Project-specific areas">{additionalProjectAreas.map((area) => <option key={area}>{area}</option>)}</optgroup> : null}</select></label><div className="measure-row"><label>Width<input required type="number" min="0.01" step="0.01" value={draft.width} onChange={(event) => setDraft({ ...draft, width: event.target.value })} /></label><span>×</span><label>Height<input required type="number" min="0.01" step="0.01" value={draft.height} onChange={(event) => setDraft({ ...draft, height: event.target.value })} /></label><label>Unit<select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}><option value="in">Inches</option><option value="ft">Feet</option><option value="m">Metres</option><option value="cm">Centimetres</option></select></label></div><label>Product / material<select value={draft.product} onChange={(event) => setDraft({ ...draft, product: event.target.value })}>{PRODUCTS.map((product) => <option key={product}>{product}</option>)}</select></label><label>Site notes <small>(optional)</small><textarea rows="4" value={draft.notes} placeholder="Add a detail the manager should know" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label><div className="cart-form-actions"><button className="submit-draft">{editingId ? 'Update cart item' : 'Add to cart'}<ShoppingCart size={16} /></button>{editingId && <button type="button" className="cancel-edit" onClick={() => { setEditingId(''); setDraft(emptyDraft()) }}><X size={15} />Cancel</button>}</div></form></section><section className="draft-panel cart-panel"><div className="section-top"><div><p className="eyebrow">02 / CART</p><h2>Ready to save</h2></div><span className="draft-count">{cart.length}</span></div>{cart.length ? <><div className="draft-list cart-list">{cart.map((item) => <article key={item.localId}><span className="draft-icon"><Package size={16} /></span><div><strong>{item.area} / {item.product}</strong><p>{item.width} × {item.height} {item.unit} {item.notes ? '· ' + item.notes : ''}</p><small>Not yet saved to the manager</small></div><div className="cart-item-actions"><button onClick={() => editCartItem(item)} title="Edit cart item"><Pencil size={14} /></button><button onClick={() => removeCartItem(item.localId)} title="Remove cart item"><Trash2 size={14} /></button></div></article>)}</div><button className="save-cart" onClick={saveCart} disabled={saving}>{saving ? 'Saving cart…' : 'Save ' + cart.length + ' item' + (cart.length === 1 ? '' : 's') + ' to manager'}<Save size={16} /></button></> : <div className="no-drafts"><ShoppingCart size={25} /><p>Add one or more entries to your cart, then save them together when ready.</p></div>}<div className="saved-submissions"><div className="saved-submissions-head"><p className="eyebrow">SAVED TO MANAGER</p><span>{project.staffDrafts?.length || 0}</span></div>{project.staffDrafts?.length ? <div className="draft-list">{project.staffDrafts.slice().reverse().map((item) => <article key={item.id}><span className="draft-icon"><CheckCircle2 size={16} /></span><div><strong>{item.area} / {item.product}</strong><p>{item.width} × {item.height} {item.unit} {item.notes ? '· ' + item.notes : ''}</p><small>Saved {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><em>{item.status === 'Pending review' ? 'Saved' : item.status}</em></article>)}</div> : <p className="saved-empty">Saved cart items will be visible here and on the manager dashboard.</p>}</div></section></div>
}

function EmptyAssignments() {
  return <section className="empty-assignments"><span><Package size={29} /></span><p className="eyebrow">NO PROJECTS YET</p><h2>No project has been created.</h2><p>Projects created in the manager app automatically appear in the project dropdown.</p></section>
}

createRoot(document.getElementById('root')).render(<App />)
