import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, CheckCircle2, ChevronDown, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, Download, FileText, FolderKanban,
  ImageIcon, LayoutDashboard, MapPin, Menu, MoreHorizontal, Package, Plus,
  Printer, Receipt, Ruler, Search, Trash2, Upload, Users, LogOut, X
} from 'lucide-react'
import './styles.css'
import { apiBase, apiUrl, canConfigureApiBase, clearApiBase, isApiConfigured, setApiBase } from './api-config.js'

const AREAS = [
  'Foyer', 'Living room', 'Dining', 'Pooja room', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3',
  'Bedroom 4', 'Bedroom 5', 'Bedroom 6', 'Bedroom 7', 'Bedroom 8', 'Bedroom 9', 'Bedroom 10',
  'Guest room', "Parents room", "Grand parent's room", "Mother's room", "Father's room",
  "Son's room", "Daughter's room", 'Master bedroom 1', 'Master bedroom 2', 'Master bedroom 3',
  'Master bedroom 4', 'Master bedroom 5', 'Kitchen', 'Balcony', 'First floor living room',
  'Second floor living room', 'Third floor living room', 'Home theatre', 'Entertainment room',
  'Bar', 'Store room', 'Walk-in wardrobe', 'Bathroom', 'Staircase', 'Gym', 'Office', 'Cabin 1',
  'Cabin 2', 'Cabin 3', 'Cabin 4', 'Cabin 5', 'Cabin 6', 'Cabin 7', 'Cabin 8', 'Cabin 9',
  'Cabin 10', 'Reception area', 'Accounts area', 'HR area', 'Design area', 'Sales area',
  'Purchase department', 'Conference room', "Owner's cabin", "Sir's cabin", "Madam's cabin",
  'Library', 'Study area'
]

const PRODUCTS = [
  ['American main curtains', 5, 'american'], ['American sheer curtains', 5, 'american'],
  ['American lining', 5, 'american'], ['Velance Fabric', 5, 'valance'],
  ['American Stitching', 18], ['Velance stitching', 18], ['Roman blinds', 18, 'roman'],
  ['Roller blinds', 18], ['Zebra blinds', 18], ['Wooden Venetian blinds', 18],
  ['Eyelet Main curtains', 5, 'eyelet'], ['Eyelet sheer curtains', 5, 'eyelet'],
  ['Eyelet lining', 5, 'eyelet'], ['Eyelet stitching', 18], ['Ripple Main curtains', 5, 'eyelet'],
  ['Ripple sheer curtain', 5, 'eyelet'], ['Ripple lining', 5, 'eyelet'], ['Ripple stitching', 18],
  ['Track', 18], ['Runners', 18], ['Ceiling Clamps', 18], ['Single wall clamp', 18],
  ['Double wall clamp', 18], ['Hooks', 18], ['Installation', 18], ['Delivery', 18],
  ['Bed back fabric', 5], ['Bed border fabric', 5], ['Bed back making', 5], ['Soft board fabric', 5],
  ['Soft board making', 18], ['Seating fabric', 5], ['Seating making', 18], ['Pillow fabric', 5],
  ['Pillow', 18], ['Mattress', 18], ['Wallpaper rolls', 18], ['Wallpaper pasting', 18],
  ['Customised wallpaper', 18], ['Customised wallpaper pasting', 18], ['Carpet', 18],
  ['Bed set', 18], ['Bedsheets', 18], ['Runner fabric', 5], ['Runner stitching', 18],
  ['Vinyl blinds', 18], ['Monsoon blinds', 18], ['Matting', 18], ['Mat', 18],
  ['PVC Matting', 18], ['Rod', 18], ['Support', 18], ['End caps', 18], ['Shower curtain', 18]
].map(([name, gst, formula]) => ({ name, gst, formula: formula || 'standard' }))

const currency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)
const quantity = (value) => Number(value || 0).toFixed(2).replace(/\.00$/, '')
const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8)
const today = () => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())

function calculateProduct(product, width, height, details = {}) {
  const w = Number(width) || 0
  const h = Number(height) || 0
  const standardArea = Math.max(0, Number(((w / 12) * (h / 12)).toFixed(2)))
  if (product.formula === 'american') {
    const panels = Math.ceil(w / 18)
    // The working-sheet convention keeps the calculated drop to two decimals
    // before multiplying by the number of 18-inch panels (e.g. 3.15 × 6 = 18.90).
    const drops = Math.floor(((h + 15) / 39) * 100) / 100
    return { quantity: panels * drops, note: panels + ' panels × ' + quantity(drops) + ' drops', unitPrice: Number(details.price) || 0 }
  }
  if (product.formula === 'valance') {
    const breadths = Math.ceil(w / 50)
    const meters = Math.ceil(((breadths * 15) / 39) * 2) / 2
    return { quantity: meters, note: breadths + ' breadths · rounded to half metre', unitPrice: Number(details.price) || 0 }
  }
  if (product.formula === 'roman') {
    const fabricQty = Math.ceil(w / 50) * ((h + 20) / 39)
    const roundedWidth = Math.ceil((w / 12) * 2) / 2
    const roundedHeight = Math.ceil((h / 12) * 2) / 2
    const rawArea = roundedWidth * roundedHeight
    const billableArea = Math.max(rawArea, Number(details.minimumArea) || 11)
    const stitching = details.romanType === 'Premium' ? 350 : 200
    const total = fabricQty * (Number(details.fabricPrice) || 0) +
      fabricQty * (Number(details.liningPrice) || 0) + billableArea * stitching
    return {
      quantity: billableArea,
      unitPrice: billableArea ? total / billableArea : 0,
      note: quantity(fabricQty) + ' m fabric + lining · ' + quantity(billableArea) + ' sq ft chargeable'
    }
  }
  return { quantity: standardArea, note: quantity(standardArea) + ' sq ft', unitPrice: Number(details.price) || 0 }
}

function staffSubmissionLine(submission) {
  const unitsToInches = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }
  const product = PRODUCTS.find((item) => item.name === submission.product) || { name: submission.product, gst: 18, formula: 'standard' }
  const measured = calculateProduct(product, Number(submission.width || 0) * (unitsToInches[submission.unit] || 1), Number(submission.height || 0) * (unitsToInches[submission.unit] || 1))
  return {
    id: 'staff-' + submission.id,
    area: submission.area,
    product: submission.product,
    quantity: measured.quantity,
    unitPrice: 0,
    gst: product.gst,
    note: measured.note + ' · Field entry by ' + (submission.staffName || 'Staff')
  }
}

const SESSION_KEY = 'krishna-decor-manager-session'
const usernameAlias = (name) => {
  const localPart = String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 60) || 'user'
  return localPart + '@krishnadecor.local'
}

async function apiRequest(path, options = {}) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}),
      ...(options.headers || {})
    }
  })
  if (response.status === 204) return {}
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.')
  return body
}

function getTotals(items) {
  const untaxed = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
  const tax5 = items.filter((item) => item.gst === 5).reduce((sum, item) => sum + item.quantity * item.unitPrice * 0.05, 0)
  const tax18 = items.filter((item) => item.gst === 18).reduce((sum, item) => sum + item.quantity * item.unitPrice * 0.18, 0)
  return { untaxed, tax5, tax18, tax: tax5 + tax18, total: untaxed + tax5 + tax18 }
}

function App() {
  const [connectionReady, setConnectionReady] = useState(() => isApiConfigured())
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })
  const [projects, setProjects] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(Boolean(session))
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [page, setPage] = useState('overview')
  const [areaId, setAreaId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const loadProjects = async () => {
    try {
      const result = await apiRequest('/projects')
      const currentProjects = result.projects || []
      setProjects(currentProjects)
      setSelectedProjectId((current) => currentProjects.some((item) => item.id === current) ? current : (currentProjects[0]?.id || ''))
      if (window.krishnaHub?.saveBackup) {
        window.krishnaHub.saveBackup({ projects: currentProjects })
      }
    } catch (error) {
      if (error.message?.includes('authentication is required') || error.status === 401) {
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
      } else {
        setToast(error.message)
      }
    } finally {
      setLoading(false)
    }
  }
  const loadStaff = async () => {
    try {
      const result = await apiRequest('/staff')
      const currentStaff = result.staff || []
      setStaff(currentStaff)
      if (window.krishnaHub?.saveBackup) {
        window.krishnaHub.saveBackup({ staff: currentStaff, projects })
      }
    } catch {}
  }
  useEffect(() => {
    if (session) {
      setLoading(true)
      loadProjects()
      loadStaff()
    }
  }, [session])
  useEffect(() => {
    if (!session) return undefined
    const interval = window.setInterval(() => loadProjects(), 8000)
    return () => window.clearInterval(interval)
  }, [session])
  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(''), 2600)
      return () => window.clearTimeout(timer)
    }
  }, [toast])

  if (!connectionReady) return <ConnectionSetup role="Manager" onConnected={() => setConnectionReady(true)} />

  const project = projects.find((item) => item.id === selectedProjectId) || projects[0]
  const selectProject = (id) => {
    const next = projects.find((item) => item.id === id)
    setSelectedProjectId(id)
    setAreaId(next?.areas[0]?.id || '')
    setPage('overview')
    setMobileMenu(false)
  }
  const patchProject = async (change) => {
    if (!project) return null
    setProjects((items) => items.map((item) => item.id === project.id ? { ...item, ...change } : item))
    try {
      const result = await apiRequest('/projects/' + project.id, { method: 'PUT', body: JSON.stringify(change) })
      return result.project
    } catch (error) {
      setToast('Could not save: ' + error.message)
      await loadProjects()
      return null
    }
  }
  const updateArea = (id, change) => {
    if (!project) return
    patchProject({ areas: project.areas.map((area) => area.id === id ? { ...area, ...change } : area) })
  }
  async function createProject(values) {
    try {
      const result = await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: values.name, customerName: values.customer })
      })
      const newProject = result.project
      setProjects((items) => [newProject, ...items])
      setSelectedProjectId(newProject.id)
      setAreaId('')
      setPage('customer')
      setShowCreate(false)
      setToast('Project created — add the site details to get started.')
    } catch (error) {
      setToast('Could not create project: ' + error.message)
    }
  }
  const completeAuthentication = (nextSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }
  const logout = async () => {
    try { await apiRequest('/auth/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setProjects([])
    setStaff([])
    setSelectedProjectId('')
  }
  const deleteProject = async () => {
    if (!project || !window.confirm('Delete "' + project.name + '"? This removes its customer, quotation, and payment records.')) return
    try {
      await apiRequest('/projects/' + project.id, { method: 'DELETE' })
      const remaining = projects.filter((item) => item.id !== project.id)
      const next = remaining[0]
      setProjects(remaining)
      setSelectedProjectId(next?.id || '')
      setAreaId(next?.areas?.[0]?.id || '')
      setToast(project.name + ' was deleted.')
    } catch (error) {
      setToast('Could not delete project: ' + error.message)
    }
  }

  const navigation = [
    ['overview', 'Overview', LayoutDashboard],
    ['customer', 'Customer details', FolderKanban],
    ['areas', 'Areas & materials', Ruler],
    ['quotations', 'Quotations', FileText],
    ['invoice', 'Invoice', Receipt],
    ['payments', 'Payments', CreditCard],
    ['team', 'Staff access', Users]
  ]
  const titles = {
    overview: ['Project overview', 'A clear view of the work, quotation and payment status.'],
    customer: ['Customer details', 'Keep the visit information and site reference together.'],
    areas: ['Areas & materials', 'Capture measurements and turn them into order-ready quantities.'],
    quotations: ['Quotations', 'Editable client-ready quotations with automatic GST totals.'],
    invoice: ['Invoice', 'Generate an invoice only from an approved quotation.'],
    payments: ['Payment tracking', 'See exactly what has been received and what is outstanding.'],
    team: ['Staff access', 'Manage staff accounts and review every field submission.']
  }
  const notifications = useMemo(() => projects.flatMap((item) => [
    ...(item.activityLog || []).map((entry) => ({
      id: entry.id,
      projectId: item.id,
      page: 'areas',
      title: entry.action,
      detail: item.name + ' · ' + entry.detail,
      createdAt: entry.createdAt
    })),
    ...(item.quotations || []).filter((quote) => quote.status !== 'Approved').map((quote) => ({
      id: item.id + '-' + quote.id,
      projectId: item.id,
      page: 'quotations',
      title: quote.id + ' needs approval',
      detail: item.name + ' · Draft quotation',
      createdAt: item.updatedAt
    }))
  ]).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8), [projects])
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setNotificationsOpen(false)
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  if (!session) return <AuthScreen onAuthenticated={completeAuthentication} onConfigure={canConfigureApiBase() ? () => { clearApiBase(); setConnectionReady(false) } : null} />
  if (loading) return <LoadingWorkspace />

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobileMenu ? 'open' : '')}>
        <div className="brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span><button className="mobile-close" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
        <div className="workspace-label">OWNER WORKSPACE</div>
        <button className="new-project" onClick={() => setShowCreate(true)}><Plus size={16} />New project</button>
        <nav>
          {navigation.map(([id, label, Icon]) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(id); setMobileMenu(false) }}><Icon size={17} />{label}{id === 'quotations' && project?.quotations?.length > 0 ? <span className="nav-count">{project.quotations.length}</span> : null}</button>)}
        </nav>
        <div className="project-label"><span>YOUR PROJECTS</span><button onClick={() => setShowCreate(true)}><Plus size={15} /></button></div>
        <div className="project-list">
          {projects.map((item) => <button className={item.id === project?.id ? 'project-card selected' : 'project-card'} key={item.id} onClick={() => selectProject(item.id)}>
            <span className="project-icon">{item.name.slice(0, 1)}</span>
            <span><strong>{item.name}</strong><small>{item.customer.name || 'New project'}</small></span>
            <MoreHorizontal size={16} />
          </button>)}
        </div>
        <div className="sidebar-footer"><span className="avatar">{session.user.name.slice(0, 2).toUpperCase()}</span><span><strong>{session.user.name}</strong><small>Owner account</small></span><button className="logout-button" title="Sign out" onClick={logout}><LogOut size={15} /></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="crumbs"><span>Projects</span><ChevronRight size={13} /><strong>{project?.name || (page === 'team' ? 'Staff access' : 'New workspace')}</strong></div>
          <div className="top-actions"><button className="search-button" onClick={() => { setNotificationsOpen(false); setSearchOpen(true) }}><Search size={17} /><span>Search</span><kbd>⌘ K</kbd></button><div className="notification-wrap"><button className="icon-button notification" title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setSearchOpen(false); setNotificationsOpen((open) => !open) }}><Bell size={19} />{notifications.length ? <i /> : null}</button>{notificationsOpen && <NotificationPanel notifications={notifications} onSelect={(notification) => { selectProject(notification.projectId); setPage(notification.page); setNotificationsOpen(false) }} />}</div><span className="avatar top-avatar">{session.user.name.slice(0, 2).toUpperCase()}</span></div>
        </header>
        <section className="page-head">
          <div><p className="eyebrow">{project?.status || 'OWNER WORKSPACE'}</p><h1>{titles[page][0]}</h1><p className="subhead">{titles[page][1]}</p></div>
          <div className="page-actions">{page === 'quotations' && project ? <button className="button primary" onClick={() => makeQuotation(project, patchProject, setToast)}><Plus size={16} />New quotation</button> : null}{project ? <button className="icon-button danger" title="Delete project" aria-label="Delete project" onClick={deleteProject}><Trash2 size={17} /></button> : null}</div>
        </section>

        {page === 'team' ? <Team projects={projects} staff={staff} loadStaff={loadStaff} loadProjects={loadProjects} toast={setToast} /> : project ? <>
          {page === 'overview' && <Overview project={project} onPage={setPage} onRefresh={loadProjects} onDeleteProject={deleteProject} />}
          {page === 'customer' && <Customer project={project} patchProject={patchProject} toast={setToast} />}
          {page === 'areas' && <Areas project={project} areaId={areaId} setAreaId={setAreaId} updateArea={updateArea} patchProject={patchProject} toast={setToast} />}
          {page === 'quotations' && <Quotations project={project} patchProject={patchProject} toast={setToast} />}
          {page === 'invoice' && <Invoice project={project} toast={setToast} />}
          {page === 'payments' && <Payments project={project} patchProject={patchProject} toast={setToast} />}
        </> : <EmptyWorkspace onCreate={() => setShowCreate(true)} />}
      </main>
      {showCreate && <NewProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} />}
      {searchOpen && <SearchDialog projects={projects} navigation={navigation} onClose={() => setSearchOpen(false)} onSelect={(result) => { if (result.type === 'project') selectProject(result.id); else setPage(result.id); setSearchOpen(false) }} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  )
}

function ConnectionSetup({ role, onConnected }) {
  const [address, setAddress] = useState(() => apiBase())
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const connect = async (event) => {
    event.preventDefault()
    setTesting(true)
    setError('')
    try {
      const base = setApiBase(address)
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
  return <main className="connection-screen"><section className="connection-card"><div className="auth-brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span></div><p className="eyebrow">{role.toUpperCase()} APP SETUP</p><h1>Connect to your workspace</h1><p>Enter the secure Render sync address for the Krishna Decor workspace.</p><form onSubmit={connect}><label>Sync address<input value={address} placeholder="https://krishna-decor-api.onrender.com/api" autoCapitalize="none" autoCorrect="off" inputMode="url" onChange={(event) => setAddress(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button className="button primary auth-submit" disabled={testing}>{testing ? 'Checking connection…' : 'Connect securely'}<ArrowUpRight size={16} /></button></form><small>The address is saved only on this device. Use HTTPS for any address outside the office network.</small></section></main>
}

function AuthScreen({ onAuthenticated, onConfigure }) {
  const [setupRequired, setSetupRequired] = useState(null)
  const [values, setValues] = useState({ name: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)

  const checkHealth = useCallback(() => {
    setChecking(true)
    apiRequest('/health')
      .then((result) => {
        setSetupRequired(result.setupRequired)
        setError('')
      })
      .catch(() => {
        setError('Cannot reach the Krishna Decor API. Start the api service, then refresh this page.')
      })
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    checkHealth()
    const timer = setInterval(() => {
      apiRequest('/health')
        .then((result) => {
          setSetupRequired(result.setupRequired)
          setError('')
        })
        .catch(() => {})
    }, 2500)
    return () => clearInterval(timer)
  }, [checkHealth])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await apiRequest(setupRequired ? '/auth/bootstrap' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...values, email: usernameAlias(values.name), role: 'manager' })
      })
      onAuthenticated(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="auth-screen"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span></div>{setupRequired === null && !error ? <div className="auth-loading"><Clock3 size={22} /><p>Connecting to your workspace…</p></div> : <><p className="eyebrow">{setupRequired ? 'SECURE FIRST-TIME SETUP' : 'OWNER SIGN IN'}</p><h1>{setupRequired ? 'Create the owner account' : 'Welcome back'}</h1><p className="auth-copy">{setupRequired ? 'There are no pre-created accounts or project records. Set the owner user name and password for this installation.' : 'Sign in to manage your live Krishna Decor projects.'}</p><form onSubmit={submit} className="auth-form" autoComplete="off"><Field label="User name" name="manager-login-name" autoComplete="off" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /><Field label="Password" name="manager-login-password" type="password" minLength="8" value={values.password} autoComplete={setupRequired ? 'new-password' : 'current-password'} onChange={(event) => setValues({ ...values, password: event.target.value })} />{error && <div className="auth-error-box"><p className="auth-error">{error}</p><button type="button" className="button secondary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={checking} onClick={checkHealth}>{checking ? 'Connecting…' : 'Retry connection'}</button></div>}<button className="button primary auth-submit" disabled={submitting || setupRequired === null}>{submitting ? 'Please wait…' : setupRequired ? 'Create owner account' : 'Sign in'}<ArrowUpRight size={16} /></button></form>{onConfigure && <button className="connection-link" onClick={onConfigure}>Use a different data server</button>}</>}</section><aside className="auth-aside"><p className="eyebrow light">KRISHNA DECOR / OWNER DESK</p><h2>Project management that carries the detail.</h2><p>Measurements, materials, approvals and payment tracking live in one secure workspace.</p><div className="auth-points"><span><CheckCircle2 size={16} />No seeded customer or financial data</span><span><CheckCircle2 size={16} />Role-limited field staff access</span><span><CheckCircle2 size={16} />Persistent shared project records</span></div></aside></main>
}

function LoadingWorkspace() {
  return <main className="loading-workspace"><span className="brand-mark">K</span><p>Loading your owner workspace…</p></main>
}

function EmptyWorkspace({ onCreate }) {
  return <section className="empty-workspace"><span className="empty-orbit"><FolderKanban size={30} /></span><p className="eyebrow">NO PROJECTS YET</p><h2>Your workspace is ready.</h2><p>Create a project to record the client, capture site measurements and prepare the first quotation.</p><button className="button primary" onClick={onCreate}><Plus size={16} />Create first project</button></section>
}

function SearchDialog({ projects, navigation, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const projectResults = projects.filter((item) => [item.name, item.customer?.name, item.customer?.location, item.customer?.address].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)))
  const pageResults = navigation.filter(([, label]) => label.toLowerCase().includes(normalizedQuery))
  return <div className="search-layer" role="presentation" onMouseDown={onClose}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={(event) => event.stopPropagation()}><div className="search-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or sections" /><button className="icon-button" title="Close search" aria-label="Close search" onClick={onClose}><X size={16} /></button></div><div className="search-results">{pageResults.length > 0 && <div className="search-group"><p>WORKSPACE</p>{pageResults.map(([id, label, Icon]) => <button key={id} onClick={() => onSelect({ type: 'page', id })}><Icon size={16} /><span>{label}</span><ChevronRight size={15} /></button>)}</div>}{projectResults.length > 0 && <div className="search-group"><p>PROJECTS</p>{projectResults.map((item) => <button key={item.id} onClick={() => onSelect({ type: 'project', id: item.id })}><FolderKanban size={16} /><span><strong>{item.name}</strong><small>{item.customer?.name || item.customer?.location || 'Project workspace'}</small></span><ChevronRight size={15} /></button>)}</div>}{!pageResults.length && !projectResults.length && <div className="search-empty">No projects or sections match &quot;{query}&quot;.</div>}</div></section></div>
}

function NotificationPanel({ notifications, onSelect }) {
  return <div className="notification-panel" role="status"><div className="notification-panel-head"><strong>Notifications</strong><span>{notifications.length}</span></div>{notifications.length ? <div className="notification-list">{notifications.map((item) => <button key={item.id} onClick={() => onSelect(item)}><Bell size={15} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={14} /></button>)}</div> : <p className="notification-empty">You are all caught up.</p>}</div>
}

function Team({ projects, staff, loadStaff, loadProjects, toast }) {
  const emptyStaffForm = { name: '', password: '' }
  const [form, setForm] = useState(emptyStaffForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [removingStaffId, setRemovingStaffId] = useState('')
  const [staffToRemove, setStaffToRemove] = useState(null)
  const createStaff = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await apiRequest('/staff', { method: 'POST', body: JSON.stringify({ ...form, email: usernameAlias(form.name) }) })
      setForm(emptyStaffForm)
      await loadStaff()
      toast('Staff account created. They can now select any project.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  const removeStaff = async (person) => {
    setRemovingStaffId(person.id)
    try {
      await apiRequest('/staff/' + person.id, { method: 'DELETE' })
      await loadStaff()
      toast(person.name + ' was removed from staff access.')
    } catch (requestError) {
      toast('Could not remove staff member: ' + requestError.message)
    } finally {
      setRemovingStaffId('')
      setStaffToRemove(null)
    }
  }
  const activity = projects.flatMap((project) => (project.activityLog || []).map((entry) => ({ ...entry, projectName: project.name }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return <><div className="team-layout"><section className="panel team-form"><div className="section-heading"><div><p className="eyebrow">FIELD ACCESS</p><h3>Add a staff member</h3></div><Users size={20} /></div><p className="team-copy">Every staff member can select any manager-created project. Each field submission is automatically attributed to their user name.</p><form onSubmit={createStaff} className="team-inputs" autoComplete="off"><Field label="Staff member name" name="new-staff-name" autoComplete="off" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Field label="Temporary password" name="new-staff-password" autoComplete="new-password" type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{error && <p className="auth-error">{error}</p>}<button className="button primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create staff account'}<ArrowUpRight size={16} /></button></form></section><section className="panel team-list"><div className="section-heading"><div><p className="eyebrow">STAFF ACCOUNTABILITY</p><h3>Field activity log</h3></div><div className="activity-actions"><span className="tag">{activity.length} records</span><button className="text-button" onClick={loadProjects}>Refresh activity</button></div></div>{activity.length ? <table className="simple-table audit-table"><thead><tr><th>Staff member</th><th>Project</th><th>Action</th><th>Recorded</th></tr></thead><tbody>{activity.map((entry) => <tr key={entry.id}><td><strong>{entry.actorName}</strong></td><td>{entry.projectName}</td><td><strong>{entry.action}</strong><small>{entry.detail}</small></td><td>{new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>)}</tbody></table> : <Empty label="Staff submissions will appear here with the user name and time recorded." />}</section><section className="panel staff-directory"><div className="section-heading"><div><p className="eyebrow">STAFF DIRECTORY</p><h3>Active accounts</h3></div></div>{staff.length ? <div className="directory-grid">{staff.map((person) => <div className="staff-card" key={person.id}><span>{person.name.slice(0, 1).toUpperCase()}</span><div><strong>{person.name}</strong><small>Name and password sign-in</small></div><button type="button" className="button remove-staff" disabled={removingStaffId === person.id} onClick={() => setStaffToRemove(person)}><Trash2 size={14} />{removingStaffId === person.id ? 'Removing...' : 'Remove'}</button></div>)}</div> : <Empty label="No staff accounts have been created." />}</section></div>{staffToRemove && <ConfirmRemovalModal person={staffToRemove} busy={removingStaffId === staffToRemove.id} onClose={() => setStaffToRemove(null)} onConfirm={() => removeStaff(staffToRemove)} />}</>
}

function ConfirmRemovalModal({ person, busy, onClose, onConfirm }) {
  return <div className="modal-layer" onMouseDown={busy ? undefined : onClose}><section className="modal confirm-removal" role="dialog" aria-modal="true" aria-label="Remove staff member" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close" disabled={busy} onClick={onClose}><X size={18} /></button><span className="modal-kicker">REMOVE STAFF ACCESS</span><h2>Remove {person.name}?</h2><p>This account will no longer be able to sign in. Existing field entries remain in the project history.</p><div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="button danger-button" disabled={busy} onClick={onConfirm}><Trash2 size={15} />{busy ? 'Removing...' : 'Remove staff'}</button></div></section></div>
}

function Overview({ project, onPage, onRefresh, onDeleteProject }) {
  const currentQuote = project.quotations[project.quotations.length - 1]
  const totals = getTotals(currentQuote?.items || [])
  const paid = project.payments.reduce((sum, payment) => sum + (payment.state === 'Received' ? payment.amount : 0), 0)
  const progress = project.areas.length ? Math.min(100, 25 + project.areas.length * 20 + (currentQuote ? 30 : 0)) : 12
  const staffDrafts = project.staffDrafts || []
  const savedDrafts = staffDrafts
  return <div className="overview-grid">
    <section className="hero-card">
      <div className="hero-glow" />
      <div className="hero-content"><p className="eyebrow light">PROJECT HEALTH</p><h2>{project.name}</h2><p>{project.customer.location || 'Add the customer’s location and visit details to start the workflow.'}</p>
        <div className="hero-progress"><div><span>Project completion</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: progress + '%' }} /></div></div>
      </div>
      <div className="hero-meta"><div><MapPin size={16} /><span><small>Location</small><b>{project.customer.location || '—'}</b></span></div></div>
      <button className="button danger-button overview-delete" onClick={onDeleteProject}><Trash2 size={15} />Delete project</button>
    </section>
    <section className="stats-row">
      <Stat icon={<Ruler size={18} />} label="Measured areas" value={project.areas.length} note={project.areas.length ? 'Ready to quote' : 'Add your first area'} />
      <Stat icon={<FileText size={18} />} label="Quotation value" value={currentQuote ? currency(totals.total) : '—'} note={currentQuote ? currentQuote.id : 'No quotation yet'} />
      <Stat icon={<CircleDollarSign size={18} />} label="Payment received" value={currency(paid)} note={currentQuote ? currency(Math.max(0, totals.total - paid)) + ' outstanding' : 'Awaiting quotation'} />
    </section>
    <section className="panel activity-panel"><div className="panel-title"><div><p className="eyebrow">WORKFLOW</p><h3>Move this project forward</h3></div><button className="text-button" onClick={() => onPage('areas')}>View all <ArrowUpRight size={15} /></button></div>
      <div className="workflow">
        <WorkflowStep done={Boolean(project.customer.name && project.customer.address)} step="01" title="Customer details" description="Site address and reference" action="Review details" onClick={() => onPage('customer')} />
        <WorkflowStep done={project.areas.length > 0} step="02" title="Areas & measurements" description={project.areas.length ? project.areas.length + ' areas measured' : 'Select spaces and enter dimensions'} action="Open areas" onClick={() => onPage('areas')} />
        <WorkflowStep done={Boolean(currentQuote)} step="03" title="Quotation" description={currentQuote ? currentQuote.id + ' is ' + currentQuote.status.toLowerCase() : 'Build the client quote'} action="View quotation" onClick={() => onPage('quotations')} />
        <WorkflowStep done={currentQuote?.status === 'Approved'} step="04" title="Invoice & payment" description="Available after quotation approval" action="Track payment" onClick={() => onPage('payments')} />
      </div>
    </section>
    <section className="panel recent-panel"><div className="panel-title"><div><p className="eyebrow">AREAS</p><h3>Latest measurements</h3></div><button className="text-button" onClick={() => onPage('areas')}>Manage areas <ArrowUpRight size={15} /></button></div>
      {project.areas.length ? <div className="area-preview-grid">{project.areas.slice(0, 4).map((area, index) => <div className={'area-preview tone-' + (index % 3)} key={area.id}><span>{String(index + 1).padStart(2, '0')}</span><h4>{area.name}</h4><p>{area.width} × {area.height} in</p><small>{area.products?.length || 0} materials</small></div>)}</div> : <Empty label="No areas have been selected yet." action="Add an area" onClick={() => onPage('areas')} />}</section>
    <section className="panel staff-updates-panel"><div className="panel-title"><div><p className="eyebrow">STAFF UPDATES</p><h3>Saved field measurements and product selections</h3></div><div className="staff-update-actions"><span className="tag">{savedDrafts.length} saved</span><button className="text-button" onClick={onRefresh}>Refresh updates</button></div></div>
      {staffDrafts.length ? <div className="staff-update-list">{staffDrafts.slice().reverse().map((draft) => <article className="staff-update" key={draft.id}><span className="staff-update-avatar">{(draft.staffName || 'S').slice(0, 1).toUpperCase()}</span><div><strong>{draft.area} / {draft.product}</strong><p>{quantity(draft.width)} × {quantity(draft.height)} {draft.unit}</p><small>Saved by {draft.staffName || 'Staff'} · {new Date(draft.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><em>{draft.status === 'Pending review' ? 'Saved' : draft.status}</em></article>)}</div> : <Empty label="Saved staff cart items will appear here automatically." />}
    </section>
  </div>
}

function Stat({ icon, label, value, note }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><p>{label}</p><h3>{value}</h3><small>{note}</small></div>
}

function WorkflowStep({ done, step, title, description, action, onClick }) {
  return <button className="workflow-step" onClick={onClick}><span className={done ? 'step-status done' : 'step-status'}>{done ? <CheckCircle2 size={18} /> : step}</span><span><strong>{title}</strong><small>{description}</small></span><span className="workflow-action">{action}<ChevronRight size={16} /></span></button>
}

function Customer({ project, patchProject, toast }) {
  const customer = project.customer
  const fileRef = useRef()
  const setCustomer = (key, value) => patchProject({ customer: { ...customer, [key]: value }, status: project.status === 'Needs site details' ? 'Site details in progress' : project.status })
  const loadPhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCustomer('sitePhoto', reader.result)
    reader.readAsDataURL(file)
  }
  return <div className="customer-layout">
    <section className="panel form-panel"><div className="section-heading"><div><p className="eyebrow">CONTACT</p><h3>Customer & site</h3></div><span className="autosave"><CheckCircle2 size={14} />Saved automatically</span></div>
      <div className="form-grid">
        <Field label="Customer name" value={customer.name} placeholder="Full name" onChange={(e) => setCustomer('name', e.target.value)} />
        <Field label="Date of visit" type="date" value={customer.visitDate} onChange={(e) => setCustomer('visitDate', e.target.value)} />
        <Field label="Site location" value={customer.location} placeholder="City, State" onChange={(e) => setCustomer('location', e.target.value)} />
        <Field label="Reference" value={customer.reference} placeholder="Architect, designer or referral" onChange={(e) => setCustomer('reference', e.target.value)} />
        <label className="field full"><span>Site address</span><textarea rows="4" value={customer.address} placeholder="Complete project address" onChange={(e) => setCustomer('address', e.target.value)} /></label>
      </div>
      <div className="form-footer"><p>These details appear on the quotation and invoice records.</p><button className="button primary" onClick={() => toast('Customer details saved.')}>Save details</button></div>
    </section>
    <section className="panel photo-panel"><div className="section-heading"><div><p className="eyebrow">SITE PIC</p><h3>Reference image</h3></div>{customer.sitePhoto && <button className="icon-button" onClick={() => setCustomer('sitePhoto', '')}><Trash2 size={16} /></button>}</div>
      {customer.sitePhoto ? <img className="site-image" src={customer.sitePhoto} alt="Project site" /> : <button className="upload-zone" onClick={() => fileRef.current?.click()}><span><ImageIcon size={27} /></span><strong>Upload site picture</strong><small>JPG, PNG or WEBP</small></button>}
      <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={loadPhoto} />
      {customer.sitePhoto && <button className="button secondary full-button" onClick={() => fileRef.current?.click()}><Upload size={16} />Replace image</button>}
    </section>
  </div>
}

function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>
}

function Areas({ project, areaId, setAreaId, updateArea, patchProject, toast }) {
  const area = project.areas.find((item) => item.id === areaId) || project.areas[0]
  const [areaChoice, setAreaChoice] = useState('')
  const [draft, setDraft] = useState({ product: PRODUCTS[0].name, price: 0, fabricPrice: 650, liningPrice: 290, romanType: 'Premium', minimumArea: 11 })
  const staffMaterials = (project.staffDrafts || []).filter((item) => item.area === area?.name).map(staffSubmissionLine)
  useEffect(() => { if (!area && project.areas[0]) setAreaId(project.areas[0].id) }, [area, project.areas, setAreaId])
  const addArea = () => {
    if (!areaChoice) return
    const newArea = { id: uid('area'), name: areaChoice, width: 0, height: 0, unit: 'in', products: [] }
    patchProject({ areas: [...project.areas, newArea], status: 'Measurements in progress' })
    setAreaId(newArea.id)
    setAreaChoice('')
    toast(areaChoice + ' added. Enter its dimensions next.')
  }
  const removeArea = (id) => {
    patchProject({ areas: project.areas.filter((item) => item.id !== id) })
    setAreaId(project.areas.filter((item) => item.id !== id)[0]?.id || '')
  }
  const toInches = (value, unit) => {
    const factors = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }
    return Number(value || 0) * factors[unit]
  }
  const fromInches = (value, unit) => {
    const factors = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }
    return Number(value || 0) / factors[unit]
  }
  const changeUnit = (unit) => updateArea(area.id, { unit })
  const changeDimension = (key, value) => updateArea(area.id, { [key]: Number(toInches(value, area.unit).toFixed(2)) })
  const selectedProduct = PRODUCTS.find((item) => item.name === draft.product) || PRODUCTS[0]
  const preview = area ? calculateProduct(selectedProduct, area.width, area.height, draft) : null
  const addMaterial = () => {
    if (!area || !area.width || !area.height) { toast('Add width and height before selecting a material.'); return }
    const calculated = calculateProduct(selectedProduct, area.width, area.height, draft)
    const item = { id: uid('line'), area: area.name, product: selectedProduct.name, quantity: calculated.quantity, unitPrice: calculated.unitPrice, gst: selectedProduct.gst, note: calculated.note }
    updateArea(area.id, { products: [...(area.products || []), item] })
    toast(selectedProduct.name + ' added with a calculated quantity.')
  }
  return <div className="areas-layout">
    <aside className="area-sidebar panel">
      <div className="section-heading"><div><p className="eyebrow">PROJECT SPACES</p><h3>Areas</h3></div><span className="tag">{project.areas.length}</span></div>
      <div className="add-area"><select value={areaChoice} onChange={(e) => setAreaChoice(e.target.value)}><option value="">Select an area</option>{AREAS.filter((name) => !project.areas.some((item) => item.name === name)).map((name) => <option key={name}>{name}</option>)}</select><button onClick={addArea} aria-label="Add selected area"><Plus size={17} /></button></div>
      <div className="area-list">{project.areas.length ? project.areas.map((item, index) => <button key={item.id} className={item.id === area?.id ? 'area-row active' : 'area-row'} onClick={() => setAreaId(item.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.name}</strong><small>{item.width && item.height ? item.width + ' × ' + item.height + ' in' : 'Measurements needed'}</small></div>{item.id === area?.id && <ChevronRight size={15} />}</button>) : <div className="area-empty">Choose a room or work area above to begin.</div>}</div>
    </aside>
    {area ? <div className="area-workspace">
      <section className="panel measurement-panel"><div className="section-heading"><div><p className="eyebrow">01 / MEASUREMENTS</p><h3>{area.name}</h3></div><button className="icon-button danger" onClick={() => removeArea(area.id)} title="Remove area"><Trash2 size={16} /></button></div>
        <div className="measurement-grid">
          <label className="measure-field"><span>Width</span><div><input type="number" min="0" value={fromInches(area.width, area.unit).toFixed(area.unit === 'in' ? 0 : 2)} onChange={(e) => changeDimension('width', e.target.value)} /><small>{area.unit}</small></div></label>
          <span className="times">×</span>
          <label className="measure-field"><span>Height</span><div><input type="number" min="0" value={fromInches(area.height, area.unit).toFixed(area.unit === 'in' ? 0 : 2)} onChange={(e) => changeDimension('height', e.target.value)} /><small>{area.unit}</small></div></label>
          <label className="unit-field"><span>Unit</span><select value={area.unit} onChange={(e) => changeUnit(e.target.value)}><option value="in">Inches</option><option value="ft">Feet</option><option value="m">Metres</option><option value="cm">Centimetres</option></select></label>
        </div>
        <div className="measurement-hint"><Ruler size={16} /><span>Stored in inches for accurate calculations. <b>{quantity(area.width)} in × {quantity(area.height)} in</b></span></div>
      </section>
      <section className="panel material-panel" id="add-product"><div className="section-heading"><div><p className="eyebrow">02 / MATERIAL</p><h3>Calculate an order line</h3></div><span className="autosave"><CheckCircle2 size={14} />Auto-calculated</span></div>
        <div className="product-controls"><label className="field product-select"><span>Product / material</span><select value={draft.product} onChange={(e) => setDraft({ ...draft, product: e.target.value })}>{PRODUCTS.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          {selectedProduct.formula === 'roman' ? <div className="roman-controls"><Field label="Fabric MRP / m" type="number" value={draft.fabricPrice} onChange={(e) => setDraft({ ...draft, fabricPrice: e.target.value })} /><Field label="Lining MRP / m" type="number" value={draft.liningPrice} onChange={(e) => setDraft({ ...draft, liningPrice: e.target.value })} /><label className="field"><span>Roman finish</span><select value={draft.romanType} onChange={(e) => setDraft({ ...draft, romanType: e.target.value })}><option>Premium</option><option>Regular</option></select></label><label className="field"><span>Minimum area</span><select value={draft.minimumArea} onChange={(e) => setDraft({ ...draft, minimumArea: e.target.value })}><option value="11">11 sq ft</option><option value="16.5">16.5 sq ft</option></select></label></div> : <Field label="MRP per unit" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />}
        </div>
        <div className="calculation-result"><div><span>Calculated quantity</span><strong>{quantity(preview?.quantity)} <small>{selectedProduct.formula === 'roman' ? 'sq ft' : selectedProduct.formula === 'valance' ? 'm' : selectedProduct.formula === 'american' ? 'm' : 'sq ft'}</small></strong><p>{preview?.note || 'Add measurements to calculate'}</p></div><div><span>Quoted unit price</span><strong>{currency(preview?.unitPrice)}</strong><p>GST {selectedProduct.gst}% applicable</p></div><button className="button primary" onClick={addMaterial}><Plus size={16} />Add line</button></div>
      </section>
      <section className="panel selected-materials"><div className="section-heading"><div><p className="eyebrow">SELECTED MATERIALS</p><h3>{(area.products?.length || 0) + staffMaterials.length} line items</h3></div></div>
        {(area.products?.length || staffMaterials.length) ? <table className="simple-table"><thead><tr><th>Material</th><th>Quantity</th><th>MRP</th><th>GST</th><th>Source</th><th /></tr></thead><tbody>{(area.products || []).map((item) => <tr key={item.id}><td><strong>{item.product}</strong><small>{item.note}</small></td><td>{quantity(item.quantity)}</td><td>{currency(item.unitPrice)}</td><td><span className="tax-pill">{item.gst}%</span></td><td><span className="material-source">Manager</span></td><td><button className="icon-button" title={'Remove ' + item.product} aria-label={'Remove ' + item.product} onClick={() => updateArea(area.id, { products: area.products.filter((x) => x.id !== item.id) })}><Trash2 size={15} /></button></td></tr>)}{staffMaterials.map((item) => <tr className="staff-material" key={item.id}><td><strong>{item.product}</strong><small>{item.note}</small></td><td>{quantity(item.quantity)}</td><td>Set in quotation</td><td><span className="tax-pill">{item.gst}%</span></td><td><span className="material-source">Staff</span></td><td /></tr>)}</tbody></table> : <Empty label="No materials added for this area." />}</section>
    </div> : <section className="panel blank-workspace"><Package size={30} /><h3>Select an area to start</h3><p>Choose a room or add a new area from the sidebar.</p></section>}
  </div>
}

function makeQuotation(project, patchProject, toast) {
  const items = [...project.areas.flatMap((area) => area.products || []), ...(project.staffDrafts || []).map(staffSubmissionLine)]
  if (!items.length) { toast('Add at least one material line before creating a quotation.'); return }
  const number = 'KD-' + String(new Date().getFullYear()).slice(-2) + '-' + String(project.quotations.length + 15).padStart(3, '0')
  patchProject({ quotations: [...project.quotations, { id: number, date: today(), status: 'Draft', items }] })
  toast(number + ' created from manager materials and saved staff entries.')
}

function Quotations({ project, patchProject, toast }) {
  const [quoteId, setQuoteId] = useState(project.quotations[project.quotations.length - 1]?.id || '')
  useEffect(() => setQuoteId(project.quotations[project.quotations.length - 1]?.id || ''), [project.quotations])
  const quote = project.quotations.find((item) => item.id === quoteId) || project.quotations[project.quotations.length - 1]
  const savedStaffEntries = project.staffDrafts || []
  const editLine = (lineId, change) => {
    patchProject({ quotations: project.quotations.map((item) => item.id === quote.id ? { ...item, items: item.items.map((line) => line.id === lineId ? { ...line, ...change } : line) } : item) })
  }
  const changeStatus = (status) => {
    patchProject({ quotations: project.quotations.map((item) => item.id === quote.id ? { ...item, status } : item), status: status === 'Approved' ? 'Quotation approved' : project.status })
    toast(quote.id + ' marked as ' + status.toLowerCase() + '.')
  }
  if (!quote) return <section className="panel empty-quote"><FileText size={32} /><p className="eyebrow">NO QUOTATION YET</p><h2>Start from your measured areas</h2><p>{savedStaffEntries.length ? savedStaffEntries.length + ' saved staff cart item' + (savedStaffEntries.length === 1 ? ' is' : 's are') + ' ready to be included.' : 'Add materials to an area, then create a quotation.'} The products and calculated quantities will carry through automatically.</p></section>
  return <div className="quotation-layout">
    <div className="quote-controls panel"><label>Quotation<select value={quote.id} onChange={(e) => setQuoteId(e.target.value)}>{project.quotations.map((item) => <option key={item.id}>{item.id} · {item.status}</option>)}</select></label><span className={'status-badge ' + quote.status.toLowerCase().replace(' ', '-')}>{quote.status}</span><div className="quote-actions"><button className="button secondary" onClick={() => window.print()}><Printer size={16} />Print</button><button className="button secondary" onClick={() => window.print()}><Download size={16} />PDF</button>{quote.status !== 'Approved' && <button className="button primary" onClick={() => changeStatus('Approved')}><CheckCircle2 size={16} />Approve</button>}</div></div>
    <DocumentSheet project={project} quote={quote} editable onEditLine={editLine} />
  </div>
}

function Total({ label, value, total }) { return <div className={total ? 'total-line total' : 'total-line'}><span>{label}</span><strong>{currency(value)}</strong></div> }

function DocumentSheet({ project, quote, editable = false, onEditLine, documentType = 'Quotation', documentNumber = quote.id }) {
  const totals = getTotals(quote.items)
  const customerName = project.customer.name || 'Customer name'
  const address = project.customer.address || project.customer.location || 'Site address to be added'
  const isInvoice = documentType !== 'Quotation'
  return <article className={'quotation-sheet document-sheet' + (isInvoice ? ' invoice-sheet' : '')}>
    <header className="document-header">
      <div className="document-company"><h2>Krishna Decor</h2><p>CTS NO-1813|B|2<br />Bapat Galli Car Parking<br /><strong>Belgaum-Karnataka</strong><br />Mob-9036674138<br />E-mail - krishna.decor2015@gmail.com</p><p className="document-customer">{customerName}<br /><span>{project.name}</span></p></div>
      <div className="document-title"><div className="document-brand">KRISHNA DECOR</div><h1>{documentType} <span>#</span> {documentNumber}</h1><p>GSTIN: 29AWZPK1722G1Z4</p></div>
    </header>
    <section className="document-details" aria-label={documentType + ' details'}><div><strong>{isInvoice ? 'Invoice Date' : 'Quotation Date'}</strong><span>{quote.date}</span></div><div><strong>{isInvoice ? 'Payment Terms' : 'Expiration'}</strong><span>{isInvoice ? 'As agreed' : 'Valid for 30 days'}</span></div><div><strong>{isInvoice ? 'Billing To' : 'Salesperson'}</strong><span>{isInvoice ? customerName : 'Krishna Decor'}</span></div></section>
    <div className="document-table-shell"><table className="document-table"><thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Taxes</th><th>Amount</th></tr></thead><tbody>{quote.items.map((line) => <tr key={line.id}><td><strong>{line.area ? line.area + ' - ' : ''}{line.product}</strong>{line.note && <small>{line.note}</small>}</td><td>{editable ? <input aria-label="Order quantity" type="number" min="0" placeholder="0" value={line.quantity || ''} onChange={(e) => onEditLine(line.id, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })} /> : <span>{quantity(line.quantity)} Units</span>}</td><td>{editable ? <div className="price-input"><span>₹</span><input aria-label="Unit price" type="number" min="0" placeholder="0" value={line.unitPrice || ''} onChange={(e) => onEditLine(line.id, { unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })} /></div> : <span>{currency(line.unitPrice)}</span>}</td><td><span>GST {line.gst}%</span></td><td><strong>{currency(line.quantity * line.unitPrice)}</strong></td></tr>)}</tbody></table></div>
    <div className="document-summary"><section className="document-terms"><h3>Terms and conditions</h3><ol><li>NO CREDIT</li><li>70% advance payment</li><li>30% balance payment BEFORE DELIVERY</li><li>Minimum delivery time is 20 days.</li><li>Early delivery is not a commitment or guarantee.</li><li>Scaffolding, ladder and stools required for installation must be provided by the customer.</li></ol></section><section className="document-totals"><Total label="Untaxed Amount" value={totals.untaxed} /><Total label="SGST / UTGST" value={totals.tax / 2} /><Total label="CGST" value={totals.tax / 2} /><Total label="Total" value={totals.total} total /></section></div>
    <footer className="document-footer"><div className="document-bank"><p>Bank Details</p><strong>KRISHNA DECOR</strong><span>Ac No 917020002479616<br />Axis Bank IFSC CODE UTIB0002941<br />Kadolkar Galli Branch</span></div><div className="document-signature"><p>I accept the above {documentType.toLowerCase()} with the terms and conditions.</p><span>Customer Signature</span></div></footer>
  </article>
}

function Invoice({ project, toast }) {
  const approved = project.quotations.find((quote) => quote.status === 'Approved')
  if (!approved) return <section className="panel invoice-state"><span className="state-icon"><Clock3 size={25} /></span><p className="eyebrow">WAITING FOR APPROVAL</p><h2>Approve a quotation first</h2><p>Invoices are intentionally restricted to approved quotations, so the billing record always matches the agreed scope.</p><button className="button secondary" onClick={() => toast('Open Quotations and mark the client-approved version.')}>View quotations</button></section>
  const invoiceNumber = 'INV-' + approved.id.replace(/^KD-/, '')
  return <div className="quotation-layout invoice-layout"><div className="quote-controls panel"><span className="status-badge approved">Approved quotation</span><div className="quote-actions"><button className="button secondary" onClick={() => window.print()}><Printer size={16} />Print bill</button><button className="button secondary" onClick={() => window.print()}><Download size={16} />Save PDF</button></div></div><DocumentSheet project={project} quote={approved} documentType="Tax Invoice" documentNumber={invoiceNumber} /></div>
}

function Payments({ project, patchProject, toast }) {
  const quote = project.quotations.find((item) => item.status === 'Approved')
  const total = getTotals(quote?.items || []).total
  const received = project.payments.reduce((sum, payment) => payment.state === 'Received' ? sum + Number(payment.amount) : sum, 0)
  const outstanding = Math.max(0, total - received)
  const canRecordPayment = Boolean(quote) && outstanding > 0
  const [showAdd, setShowAdd] = useState(false)
  const [payment, setPayment] = useState({ label: 'Advance payment', amount: '', method: 'Bank transfer', date: new Date().toISOString().slice(0, 10) })
  const addPayment = async () => {
    const amount = Number(payment.amount)
    if (!quote) { toast('Approve a quotation before recording a payment.'); return }
    if (!Number.isFinite(amount) || amount <= 0) { toast('Enter a payment amount greater than zero.'); return }
    if (amount > outstanding) { toast('Payment cannot exceed the outstanding balance of ' + currency(outstanding) + '.'); return }
    const saved = await patchProject({ payments: [...project.payments, { ...payment, id: uid('pay'), amount, state: 'Received' }] })
    if (saved) {
      setShowAdd(false)
      setPayment({ ...payment, amount: '' })
      toast('Payment recorded.')
    }
  }
  return <div className="payments-layout">
    <section className="payment-hero panel"><div><p className="eyebrow">COLLECTION STATUS</p><h2>{currency(received)} <span>received</span></h2><p>{quote ? 'Against approved quotation ' + quote.id : 'Approve a quotation before recording payments.'}</p></div><div className="payment-amounts"><div><small>Quotation total</small><strong>{currency(total)}</strong></div><div><small>Outstanding</small><strong>{currency(outstanding)}</strong></div></div></section>
    <section className="panel payment-ledger"><div className="section-heading"><div><p className="eyebrow">PAYMENT LEDGER</p><h3>Project payments</h3></div><button className="button primary" title={!quote ? 'Approve a quotation before recording payments' : outstanding <= 0 ? 'The approved quotation has been paid in full' : 'Record payment'} disabled={!canRecordPayment} onClick={() => setShowAdd(!showAdd)}><Plus size={16} />Record payment</button></div>
      {!quote && <p className="payment-note">Payments become available once a quotation is approved.</p>}{quote && outstanding <= 0 && <p className="payment-note">This approved quotation has been paid in full. No further payment records can be added.</p>}
      {showAdd && canRecordPayment && <div className="payment-form"><Field label="Payment for" value={payment.label} onChange={(e) => setPayment({ ...payment, label: e.target.value })} /><Field label="Amount" type="number" min="0.01" max={outstanding} step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /><label className="field"><span>Method</span><select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option></select></label><Field label="Received date" type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} /><button className="button primary" disabled={!payment.amount || Number(payment.amount) <= 0 || Number(payment.amount) > outstanding} onClick={addPayment}>Add</button></div>}
      {project.payments.length ? <table className="simple-table payment-table"><thead><tr><th>Payment</th><th>Date</th><th>Method</th><th>Status</th><th>Amount</th></tr></thead><tbody>{project.payments.map((item) => <tr key={item.id}><td><strong>{item.label}</strong></td><td>{item.date}</td><td>{item.method}</td><td><span className="status-badge approved">{item.state}</span></td><td><strong>{currency(item.amount)}</strong></td></tr>)}</tbody></table> : <Empty label="No payments recorded yet." />}</section>
  </div>
}

function Empty({ label, action, onClick }) { return <div className="empty-state"><Package size={22} /><p>{label}</p>{action && <button className="text-button" onClick={onClick}>{action}<ArrowUpRight size={14} /></button>}</div> }

function NewProjectModal({ onClose, onCreate }) {
  const [values, setValues] = useState({ name: '', customer: '' })
  return <div className="modal-layer" onMouseDown={onClose}><form className="modal" onSubmit={(e) => { e.preventDefault(); onCreate(values) }} onMouseDown={(e) => e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X size={18} /></button><span className="modal-kicker">NEW PROJECT</span><h2>Set up a project</h2><p>Start with a project name. Customer details can be completed in the next step.</p><Field label="Project name" value={values.name} placeholder="e.g. Mehta Residence" onChange={(e) => setValues({ ...values, name: e.target.value })} /><Field label="Customer name (optional)" value={values.customer} placeholder="e.g. Priya Mehta" onChange={(e) => setValues({ ...values, customer: e.target.value })} /><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">Create project <ArrowUpRight size={16} /></button></div></form></div>
}

createRoot(document.getElementById('root')).render(<App />)
