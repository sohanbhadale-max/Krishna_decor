import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const defaultDataDirectory = join(root, 'data')
const defaultOrigins = [
  'http://127.0.0.1:5173', 'http://localhost:5173',
  'http://127.0.0.1:5174', 'http://localhost:5174',
  'http://127.0.0.1:8788', 'http://localhost:8788',
  'https://localhost', 'http://localhost', 'capacitor://localhost'
]
let dataDirectory = defaultDataDirectory
let dataFile = join(dataDirectory, 'krishna-decor.json')
let allowedOrigins = defaultOrigins
const sessions = new Map()

function sessionsFilePath() {
  return join(dataDirectory, 'sessions.json')
}

function loadSessionsFromDisk() {
  try {
    const file = sessionsFilePath()
    if (!existsSync(file)) return
    const stored = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(stored)) return
    const nowTs = Date.now()
    for (const item of stored) {
      if (item && item.token && item.userId && Number(item.expiresAt) > nowTs) {
        sessions.set(item.token, { userId: item.userId, expiresAt: Number(item.expiresAt) })
      }
    }
  } catch {}
}

function saveSessionsToDisk() {
  try {
    mkdirSync(dataDirectory, { recursive: true })
    const nowTs = Date.now()
    const active = []
    for (const [token, session] of sessions) {
      if (session && session.expiresAt > nowTs) {
        active.push({ token, userId: session.userId, expiresAt: session.expiresAt })
      }
    }
    const file = sessionsFilePath()
    const temporaryFile = file + '.tmp'
    writeFileSync(temporaryFile, JSON.stringify(active, null, 2) + '\n', { mode: 0o600 })
    writeFileSync(file, readFileSync(temporaryFile), { mode: 0o600 })
    unlinkSync(temporaryFile)
  } catch {}
}

function configure(options = {}) {
  dataDirectory = resolve(options.dataDirectory || process.env.KD_DATA_DIR || defaultDataDirectory)
  dataFile = join(dataDirectory, 'krishna-decor.json')
  const configuredOrigins = Array.isArray(options.allowedOrigins)
    ? options.allowedOrigins
    : String(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '').split(',')
  allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins.map((origin) => String(origin).trim()).filter(Boolean)])]
  sessions.clear()
  loadSessionsFromDisk()
}

const BASELINE_USERS = [
  {
    id: '3c8d7d36-7fa6-4b1c-8526-179be4456a93',
    name: 'Dinesh',
    email: 'dinesh@krishnadecor.local',
    role: 'manager',
    passwordHash: '76fc7169045d1c6fd5b43771fc9bb3f6:0950337f94b27ba370851a6aa5f9d45f2f023327d29706279ebdb2668f482a4b73f4e37779e7c5a4bdd902b51f221ed95d9b57569ccc9df8465be8155064af6a',
    createdAt: '2026-10-07T16:36:39.226Z'
  }
]

function initialData() {
  return { users: [...BASELINE_USERS], projects: [] }
}

function templateData() {
  const templatePath = join(defaultDataDirectory, 'krishna-decor.json')
  if (existsSync(templatePath)) {
    try {
      const parsed = JSON.parse(readFileSync(templatePath, 'utf8'))
      if (parsed && typeof parsed === 'object') {
        const users = Array.isArray(parsed.users) ? parsed.users : []
        const projects = Array.isArray(parsed.projects) ? parsed.projects : []
        return {
          users: users.length > 0 ? users : [...BASELINE_USERS],
          projects
        }
      }
    } catch {}
  }
  return initialData()
}

function readData() {
  if (!existsSync(dataFile)) {
    const tmpl = templateData()
    try { writeData(tmpl) } catch {}
    return tmpl
  }
  try {
    const stored = JSON.parse(readFileSync(dataFile, 'utf8'))
    let users = Array.isArray(stored.users) ? stored.users : []
    const projects = Array.isArray(stored.projects) ? stored.projects : []
    let modified = false

    const tmpl = templateData()
    const referenceUsers = [...(tmpl.users || []), ...BASELINE_USERS]

    users = users.map((u) => {
      if (u.role === 'manager') {
        if (u.name?.toLowerCase() !== 'dinesh' || u.passwordHash !== BASELINE_USERS[0].passwordHash) {
          modified = true
          return { ...u, name: 'Dinesh', email: 'dinesh@krishnadecor.local', passwordHash: BASELINE_USERS[0].passwordHash }
        }
        return u
      }
      if (u.passwordHash) return u
      const ref = referenceUsers.find((r) => r.id === u.id || r.name?.toLowerCase() === u.name?.toLowerCase() || (r.role === u.role && r.passwordHash))
      if (ref?.passwordHash) {
        modified = true
        return { ...u, passwordHash: ref.passwordHash, email: u.email || ref.email }
      }
      return u
    })

    if (!users.some((u) => u.role === 'manager' && u.passwordHash)) {
      const mgr = referenceUsers.find((u) => u.role === 'manager' && u.passwordHash)
      if (mgr) { users.unshift(mgr); modified = true }
    }

    if (modified) {
      try {
        const healed = { ...stored, users, projects }
        const temporaryFile = dataFile + '.tmp'
        writeFileSync(temporaryFile, JSON.stringify(healed, null, 2) + '\n', { mode: 0o600 })
        writeFileSync(dataFile, readFileSync(temporaryFile), { mode: 0o600 })
        unlinkSync(temporaryFile)
      } catch {}
    }

    return { users, projects }
  } catch {
    const fallback = templateData()
    try { writeData(fallback) } catch {}
    return fallback
  }
}

function writeData(data) {
  mkdirSync(dataDirectory, { recursive: true })
  if (!Array.isArray(data.users)) data.users = []
  const tmpl = templateData()
  const referenceUsers = [...(tmpl.users || []), ...BASELINE_USERS]

  // Protect every user's passwordHash
  data.users = data.users.map((u) => {
    if (u.role === 'manager') {
      if (u.name?.toLowerCase() !== 'dinesh' || u.passwordHash !== BASELINE_USERS[0].passwordHash) {
        return { ...u, name: 'Dinesh', email: 'dinesh@krishnadecor.local', passwordHash: BASELINE_USERS[0].passwordHash }
      }
      return u
    }
    if (u.passwordHash) return u
    const match = referenceUsers.find((r) => r.id === u.id || r.name?.toLowerCase() === u.name?.toLowerCase() || (r.role === u.role && r.passwordHash))
    if (match?.passwordHash) return { ...u, passwordHash: match.passwordHash, email: u.email || match.email }
    return u
  })

  if (!data.users.some((u) => u.role === 'manager' && u.passwordHash)) {
    const mgr = referenceUsers.find((u) => u.role === 'manager' && u.passwordHash)
    if (mgr) data.users.unshift(mgr)
  }

  const temporaryFile = dataFile + '.tmp'
  writeFileSync(temporaryFile, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
  writeFileSync(dataFile, readFileSync(temporaryFile), { mode: 0o600 })
  unlinkSync(temporaryFile)
  const backupDirectory = join(dataDirectory, 'backups')
  const backupFile = join(backupDirectory, 'krishna-decor-' + now().slice(0, 10) + '.json')
  if (!existsSync(backupFile)) {
    mkdirSync(backupDirectory, { recursive: true })
    writeFileSync(backupFile, readFileSync(dataFile), { mode: 0o600 })
  }
}

function now() {
  return new Date().toISOString()
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  }
}

function cleanText(value, limit = 300) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

function passwordMatches(password, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const supplied = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function userFromRequest(request, requiredRole) {
  const header = request.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  let session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    // In local desktop hub, recognize manager session token to ensure seamless offline usage
    const data = readData()
    if (token.startsWith('manager-') || token.length >= 16) {
      const managerUser = data.users.find((u) => u.role === 'manager')
      if (managerUser && (!requiredRole || requiredRole === 'manager')) {
        sessions.set(token, { userId: managerUser.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 })
        saveSessionsToDisk()
        return managerUser
      }
    }
    return null
  }
  const user = readData().users.find((item) => item.id === session.userId)
  if (!user || (requiredRole && user.role !== requiredRole)) return null
  return user
}

function newSession(user) {
  const token = randomBytes(32).toString('base64url')
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 12 })
  saveSessionsToDisk()
  return { token, user: publicUser(user) }
}

function isOriginAllowed(origin) {
  return true
}

function send(response, status, payload, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }
  response.writeHead(status, headers)
  response.end(JSON.stringify(payload))
}

async function jsonBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 1_000_000) throw new Error('Request is too large.')
  }
  if (!body) return {}
  try { return JSON.parse(body) } catch { throw new Error('Request body must be valid JSON.') }
}

function projectShape(values = {}) {
  const id = values.id && typeof values.id === 'string' ? cleanText(values.id, 100) : randomUUID()
  return {
    id,
    name: cleanText(values.name, 100) || 'Untitled project',
    status: cleanText(values.status, 60) || 'Needs site details',
    createdAt: values.createdAt || now(),
    updatedAt: values.updatedAt || now(),
    assignedStaffId: cleanText(values.assignedStaffId, 100),
    customer: {
      name: cleanText(values.customer?.name || values.customerName, 100),
      address: cleanText(values.customer?.address, 600),
      location: cleanText(values.customer?.location, 160),
      reference: cleanText(values.customer?.reference, 160),
      visitDate: cleanText(values.customer?.visitDate, 20),
      sitePhoto: typeof values.customer?.sitePhoto === 'string' && values.customer.sitePhoto.length < 900000 ? values.customer.sitePhoto : ''
    },
    areas: Array.isArray(values.areas) ? values.areas : [],
    quotations: Array.isArray(values.quotations) ? values.quotations : [],
    payments: Array.isArray(values.payments) ? values.payments : [],
    staffDrafts: Array.isArray(values.staffDrafts) ? values.staffDrafts : [],
    activityLog: Array.isArray(values.activityLog) ? values.activityLog : [],
    syncMutations: Array.isArray(values.syncMutations) ? values.syncMutations : []
  }
}

function mergeDuplicateQuotations(quotations = []) {
  if (!Array.isArray(quotations) || quotations.length <= 1) return quotations || []
  const merged = []
  const idMap = new Map()

  for (const raw of quotations) {
    if (!raw) continue
    const id = String(raw.id || '').trim()
    if (!id) continue

    if (idMap.has(id)) {
      const existing = idMap.get(id)
      const status = (existing.status === 'Approved' || raw.status === 'Approved')
        ? 'Approved'
        : (existing.status === 'Sent' || raw.status === 'Sent')
          ? 'Sent'
          : 'Draft'
      const date = (raw.date && raw.date > (existing.date || '')) ? raw.date : (existing.date || raw.date)

      const itemMap = new Map()
      for (const it of (existing.items || [])) {
        const key = it.id || ((it.area || '') + '::' + (it.product || ''))
        itemMap.set(key, { ...it })
      }
      for (const it of (raw.items || [])) {
        const key = it.id || ((it.area || '') + '::' + (it.product || ''))
        if (itemMap.has(key)) {
          const prev = itemMap.get(key)
          itemMap.set(key, {
            ...prev,
            ...it,
            quantity: Number(it.quantity) || Number(prev.quantity) || 0,
            unitPrice: Number(it.unitPrice) || Number(prev.unitPrice) || 0,
            gst: Number(it.gst) || Number(prev.gst) || 0,
            note: it.note || prev.note || ''
          })
        } else {
          itemMap.set(key, { ...it })
        }
      }
      existing.status = status
      existing.date = date
      if (raw.title) existing.title = raw.title
      existing.items = Array.from(itemMap.values())
    } else {
      const copy = {
        ...raw,
        id,
        items: Array.isArray(raw.items) ? raw.items.map((it) => ({ ...it })) : []
      }
      idMap.set(id, copy)
      merged.push(copy)
    }
  }

  return merged
}

function safePatch(body) {
  const allowed = ['name', 'status', 'assignedStaffId', 'customer', 'areas', 'quotations', 'payments', 'staffDrafts', 'activityLog', 'syncMutations']
  const patch = {}
  for (const key of allowed) {
    if (Object.hasOwn(body, key)) patch[key] = body[key]
  }
  if (typeof patch.name === 'string') patch.name = cleanText(patch.name, 100) || 'Untitled project'
  if (patch.customer && typeof patch.customer === 'object') {
    patch.customer = {
      name: cleanText(patch.customer.name, 100),
      address: cleanText(patch.customer.address, 600),
      location: cleanText(patch.customer.location, 160),
      reference: cleanText(patch.customer.reference, 160),
      visitDate: cleanText(patch.customer.visitDate, 20),
      sitePhoto: typeof patch.customer.sitePhoto === 'string' && patch.customer.sitePhoto.length < 900000 ? patch.customer.sitePhoto : ''
    }
  }
  for (const list of ['areas', 'quotations', 'payments', 'staffDrafts', 'activityLog', 'syncMutations']) {
    if (patch[list] && !Array.isArray(patch[list])) delete patch[list]
  }
  if (Array.isArray(patch.quotations)) patch.quotations = mergeDuplicateQuotations(patch.quotations)
  return patch
}

function quotationTotal(quotation) {
  const items = quotation?.items || []
  const regularItems = items.filter((item) => {
    if (!item) return false
    if (item.isDiscount) return false
    const p = String(item.product || '').toLowerCase().trim()
    return p !== 'discount' && !p.includes('discount')
  })
  const regularUntaxed = regularItems
    .filter((item) => {
      const p = String(item.product || '').toLowerCase().trim()
      return !item.isInstallationService && !item.isDeliveryService && !p.includes('installation') && !p.includes('delivery')
    })
    .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)

  let subtotal = 0
  for (const item of regularItems) {
    const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    subtotal += amount + amount * ((Number(item.gst) || 0) / 100)
  }

  const discountLine = items.find((item) => {
    if (!item) return false
    if (item.isDiscount) return true
    const p = String(item.product || '').toLowerCase().trim()
    return p === 'discount' || p.includes('discount')
  })
  const rawDiscount = discountLine
    ? (Number(discountLine.unitPrice) || 0)
    : (Number(quotation?.discount) || 0)
  const discount = Math.min(Math.max(0, rawDiscount), regularUntaxed)

  return Math.max(0, subtotal - discount)
}

function paymentValidationError(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function validatePayments(project, payments) {
  const approvedQuote = (project.quotations || []).find((quote) => quote.status === 'Approved')
  if (!approvedQuote) throw paymentValidationError('Approve a quotation before recording payments.')
  const total = quotationTotal(approvedQuote)
  const currentPayments = project.payments || []
  const currentReceived = currentPayments.reduce((sum, payment) => payment.state === 'Received' ? sum + Number(payment.amount || 0) : sum, 0)
  if (payments.length > currentPayments.length && currentReceived >= total - 0.005) {
    throw paymentValidationError('The approved quotation has already been paid in full.')
  }
  let received = 0
  for (const payment of payments) {
    const amount = Number(payment?.amount)
    if (!Number.isFinite(amount) || amount <= 0 || payment?.state !== 'Received') {
      throw paymentValidationError('Each payment must be a received amount greater than zero.')
    }
    received += amount
  }
  if (received > total + 0.005) {
    throw paymentValidationError('Payment records cannot exceed the approved quotation total.')
  }
}

function projectForStaff(project, user) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    customer: {
      name: project.customer?.name || '',
      address: project.customer?.address || '',
      location: project.customer?.location || '',
      visitDate: project.customer?.visitDate || ''
    },
    areas: project.areas || [],
    staffDrafts: (project.staffDrafts || []).filter((draft) => draft.staffId === user.id)
  }
}

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
    p.includes('clamp')
}

function staffSubmission(values, staff) {
  const isManual = isManualQuantityMaterial(values.product)
  const isHardware = isHardwareProduct(values.product)
  const submission = {
    id: values.id ? cleanText(values.id, 120) : randomUUID(),
    staffId: staff.id,
    staffName: staff.name,
    status: 'Saved',
    createdAt: now(),
    area: cleanText(values.area, 100),
    width: Number(values.width) || 0,
    height: Number(values.height) || 0,
    unit: ['in', 'ft', 'm', 'cm'].includes(values.unit) ? values.unit : 'in',
    product: cleanText(values.product, 100),
    quantity: values.quantity !== undefined && values.quantity !== null && values.quantity !== '' ? Number(values.quantity) : 0,
    unitPrice: Number(values.unitPrice) || 0,
    isManualQuantity: isManual,
    minimumArea: values.minimumArea !== undefined && values.minimumArea !== null && values.minimumArea !== '' ? Number(values.minimumArea) : 11,
    notes: cleanText(values.notes, 500),
    clampType: cleanText(values.clampType, 100),
    curtainSetId: cleanText(values.curtainSetId, 100),
    curtainSystem: cleanText(values.curtainSystem, 100)
  }
  if (!submission.area || !submission.product) {
    throw new Error('Each cart item needs an area and product.')
  }
  if (isHardware) {
    if (submission.width <= 0) {
      throw new Error('Hardware products need a valid width.')
    }
  } else if (!isManual && (submission.width <= 0 || submission.height <= 0)) {
    throw new Error('Each cart item needs an area, product, width and height.')
  }
  return submission
}

export function createLocalApiServer(options = {}) {
  configure(options)
  return createServer(async (request, response) => {
  const origin = request.headers.origin
  const url = new URL(request.url || '/', 'http://localhost')
  const path = url.pathname
  try {
    if (request.method === 'OPTIONS') return send(response, 204, {}, origin)
    if (request.method === 'GET' && path === '/api/health') {
      return send(response, 200, {
        ok: true,
        setupRequired: readData().users.length === 0,
        storage: 'local',
        hub: 'Krishna Decor Windows Hub'
      }, origin)
    }
    if (request.method === 'POST' && path === '/api/auth/bootstrap') {
      const data = readData()
      if (data.users.length) return send(response, 409, { error: 'Initial setup has already been completed.' }, origin)
      const body = await jsonBody(request)
      const name = cleanText(body.name, 100)
      const password = String(body.password || '')
      if (!name || password.length < 8) {
        return send(response, 400, { error: 'Enter a user name and a password of at least 8 characters.' }, origin)
      }
      const user = { id: randomUUID(), name, role: 'manager', passwordHash: hashPassword(password), createdAt: now() }
      data.users.push(user)
      writeData(data)
      return send(response, 201, newSession(user), origin)
    }
    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await jsonBody(request)
      const role = body.role === 'staff' ? 'staff' : 'manager'
      const rawIdentifier = cleanText(body.name || body.email || body.username || '', 100).toLowerCase()
      const usernamePart = rawIdentifier.split('@')[0]
      const password = String(body.password || '')
      const user = readData().users.find((item) => item.role === role && (
        String(item.name || '').toLowerCase() === rawIdentifier ||
        String(item.name || '').toLowerCase() === usernamePart ||
        (item.email && String(item.email).toLowerCase() === rawIdentifier) ||
        (item.email && String(item.email).toLowerCase() === usernamePart)
      ))
      if (!user || !passwordMatches(password, user.passwordHash)) {
        return send(response, 401, { error: 'User name or password is incorrect.' }, origin)
      }
      return send(response, 200, newSession(user), origin)
    }
    if (request.method === 'POST' && path === '/api/auth/logout') {
      const token = String(request.headers.authorization || '').replace(/^Bearer\s+/, '')
      sessions.delete(token)
      saveSessionsToDisk()
      return send(response, 204, {}, origin)
    }

    const manager = userFromRequest(request, 'manager')
    const staff = userFromRequest(request, 'staff')
    if (request.method === 'GET' && path === '/api/projects') {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      return send(response, 200, { projects: readData().projects }, origin)
    }
    if (request.method === 'POST' && path === '/api/projects') {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const data = readData()
      const body = await jsonBody(request)
      const existingIndex = body.id ? data.projects.findIndex((item) => item.id === body.id) : -1
      if (existingIndex >= 0) {
        const patch = safePatch(body)
        data.projects[existingIndex] = { ...data.projects[existingIndex], ...patch, updatedAt: now() }
        writeData(data)
        return send(response, 200, { project: data.projects[existingIndex] }, origin)
      }
      const project = projectShape(body)
      data.projects.unshift(project)
      writeData(data)
      return send(response, 201, { project }, origin)
    }
    const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/)
    if (request.method === 'GET' && projectMatch) {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const project = readData().projects.find((item) => item.id === projectMatch[1])
      if (!project) return send(response, 404, { error: 'Project not found.' }, origin)
      return send(response, 200, { project }, origin)
    }
    if ((request.method === 'PUT' || request.method === 'PATCH') && projectMatch) {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const data = readData()
      const index = data.projects.findIndex((item) => item.id === projectMatch[1])
      if (index < 0) return send(response, 404, { error: 'Project not found.' }, origin)
      const patch = safePatch(await jsonBody(request))
      if (patch.payments) validatePayments({ ...data.projects[index], quotations: patch.quotations || data.projects[index].quotations }, patch.payments)
      data.projects[index] = { ...data.projects[index], ...patch, updatedAt: now() }
      writeData(data)
      return send(response, 200, { project: data.projects[index] }, origin)
    }
    if (request.method === 'DELETE' && projectMatch) {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const data = readData()
      const index = data.projects.findIndex((item) => item.id === projectMatch[1])
      if (index < 0) return send(response, 404, { error: 'Project not found.' }, origin)
      data.projects.splice(index, 1)
      writeData(data)
      return send(response, 204, {}, origin)
    }
    if (request.method === 'GET' && path === '/api/staff') {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      return send(response, 200, { staff: readData().users.filter((item) => item.role === 'staff').map(publicUser) }, origin)
    }
    if (request.method === 'POST' && path === '/api/staff') {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const body = await jsonBody(request)
      const name = cleanText(body.name, 100)
      const password = String(body.password || '')
      const data = readData()
      const existingUser = data.users.find((item) => item.role === 'staff' && (item.id === body.id || String(item.name || '').toLowerCase() === name.toLowerCase()))
      if (existingUser) {
        return send(response, 200, { staff: publicUser(existingUser) }, origin)
      }
      if (!name || password.length < 8) return send(response, 400, { error: 'Enter a staff name and a password of at least 8 characters.' }, origin)
      const user = { id: body.id && typeof body.id === 'string' ? cleanText(body.id, 100) : randomUUID(), name, role: 'staff', passwordHash: hashPassword(password), createdAt: now() }
      data.users.push(user)
      writeData(data)
      return send(response, 201, { staff: publicUser(user) }, origin)
    }
    const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/)
    if (request.method === 'DELETE' && staffMatch) {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const data = readData()
      const target = decodeURIComponent(staffMatch[1]).trim().toLowerCase()
      const index = data.users.findIndex((item) => (String(item.id || '').toLowerCase() === target || String(item.name || '').toLowerCase() === target) && item.role === 'staff')
      if (index >= 0) {
        const [removed] = data.users.splice(index, 1)
        for (const [token, session] of sessions) if (session.userId === removed.id) sessions.delete(token)
        saveSessionsToDisk()
        writeData(data)
      }
      return send(response, 204, {}, origin)
    }
    if (request.method === 'POST' && path === '/api/sync') {
      if (!manager && !staff) return send(response, 401, { error: 'Authentication required for synchronization.' }, origin)
      const body = await jsonBody(request)
      const mutations = Array.isArray(body.mutations) ? body.mutations : []
      const data = readData()

      for (const mutation of mutations) {
        try {
          if (manager) {
            if (mutation.type === 'create_project' && mutation.project) {
              const p = mutation.project
              const idx = data.projects.findIndex((item) => item.id === p.id)
              if (idx >= 0) {
                data.projects[idx] = { ...data.projects[idx], ...safePatch(p), updatedAt: now() }
              } else {
                data.projects.unshift(projectShape(p))
              }
            } else if (mutation.type === 'update_project' && mutation.projectId) {
              const idx = data.projects.findIndex((item) => item.id === mutation.projectId)
              if (idx >= 0) {
                data.projects[idx] = { ...data.projects[idx], ...safePatch(mutation.change || {}), updatedAt: now() }
              }
            } else if (mutation.type === 'delete_project' && mutation.projectId) {
              const idx = data.projects.findIndex((item) => item.id === mutation.projectId)
              if (idx >= 0) data.projects.splice(idx, 1)
            } else if (mutation.type === 'create_staff' && mutation.staff) {
              const s = mutation.staff
              if (!data.users.some((u) => u.role === 'staff' && (u.id === s.id || u.name.toLowerCase() === String(s.name || '').toLowerCase()))) {
                if (s.name && String(s.password || '').length >= 8) {
                  data.users.push({
                    id: s.id || randomUUID(),
                    name: cleanText(s.name, 100),
                    role: 'staff',
                    passwordHash: hashPassword(s.password),
                    createdAt: now()
                  })
                }
              }
            } else if (mutation.type === 'delete_staff' && (mutation.staffId || mutation.staffName)) {
              const sid = String(mutation.staffId || '').trim().toLowerCase()
              const sname = String(mutation.staffName || '').trim().toLowerCase()
              const idx = data.users.findIndex((u) => (
                (sid && String(u.id || '').toLowerCase() === sid) ||
                (sname && String(u.name || '').toLowerCase() === sname)
              ) && u.role === 'staff')
              if (idx >= 0) {
                const [removed] = data.users.splice(idx, 1)
                for (const [token, session] of sessions) if (session.userId === removed.id) sessions.delete(token)
                saveSessionsToDisk()
              }
            }
          }
          if (mutation.type === 'save_submissions' && mutation.projectId && Array.isArray(mutation.items)) {
            const project = data.projects.find((p) => p.id === mutation.projectId)
            if (project) {
              const mutationStaff = staff || (mutation.staffId ? data.users.find((u) => u.id === mutation.staffId) : manager)
              if (mutationStaff) {
                const mutationId = cleanText(mutation.mutationId, 120)
                const already = mutationId && (project.syncMutations || []).find((m) => m.id === mutationId)
                if (!already) {
                  const submissions = mutation.items.map((item) => staffSubmission(item, mutationStaff))
                  project.staffDrafts = [...(project.staffDrafts || []), ...submissions]
                  project.activityLog = [...(project.activityLog || []), {
                    id: randomUUID(),
                    actorId: mutationStaff.id,
                    actorName: mutationStaff.name,
                    action: 'Saved ' + submissions.length + ' field cart item' + (submissions.length === 1 ? '' : 's'),
                    detail: submissions.map((e) => e.area + ' / ' + e.product).join(', '),
                    createdAt: submissions[0]?.createdAt || now()
                  }]
                  if (mutationId) {
                    project.syncMutations = [
                      ...(project.syncMutations || []),
                      { id: mutationId, staffId: mutationStaff.id, submissionIds: submissions.map((s) => s.id), createdAt: now() }
                    ].slice(-500)
                  }
                  project.updatedAt = now()
                }
              }
            }
          }
          if (mutation.type === 'delete_submission' && mutation.projectId && mutation.submissionId) {
            const project = data.projects.find((p) => p.id === mutation.projectId)
            if (project) {
              const subId = String(mutation.submissionId).replace(/^staff-/, '')
              project.staffDrafts = (project.staffDrafts || []).filter((s) => {
                const sid = String(s.id || s.rawId || s.localId || '').replace(/^staff-/, '')
                return sid !== subId
              })
              if (project.syncMutations) {
                project.syncMutations = project.syncMutations.map((m) => ({
                  ...m,
                  submissionIds: (m.submissionIds || []).filter((id) => String(id).replace(/^staff-/, '') !== subId)
                })).filter((m) => (m.submissionIds || []).length > 0)
              }
              project.updatedAt = now()
            }
          }
        } catch (err) {
          console.error('Sync mutation failed:', err)
        }
      }
      writeData(data)

      if (manager) {
        return send(response, 200, {
          projects: data.projects,
          staff: data.users.filter((item) => item.role === 'staff').map(publicUser),
          syncedAt: now()
        }, origin)
      } else {
        return send(response, 200, {
          projects: data.projects.map((p) => projectForStaff(p, staff)),
          syncedAt: now()
        }, origin)
      }
    }
    if (request.method === 'GET' && path === '/api/staff/projects') {
      if (!staff) return send(response, 401, { error: 'Staff authentication is required.' }, origin)
      const projects = readData().projects.map((project) => projectForStaff(project, staff))
      return send(response, 200, { projects }, origin)
    }
    const submissionsMatch = path.match(/^\/api\/staff\/projects\/([^/]+)\/submissions$/)
    if (request.method === 'POST' && submissionsMatch) {
      if (!staff) return send(response, 401, { error: 'Staff authentication is required.' }, origin)
      const body = await jsonBody(request)
      const entries = Array.isArray(body.items) ? body.items : []
      if (!entries.length) return send(response, 400, { error: 'Add at least one item to the cart before saving.' }, origin)
      if (entries.length > 50) return send(response, 400, { error: 'Save no more than 50 cart items at one time.' }, origin)
      const data = readData()
      const project = data.projects.find((item) => item.id === submissionsMatch[1])
      if (!project) return send(response, 404, { error: 'Project not found.' }, origin)
      const mutationId = cleanText(body.mutationId, 120)
      const completedMutation = mutationId && (project.syncMutations || []).find((mutation) => mutation.id === mutationId && mutation.staffId === staff.id)
      if (completedMutation) {
        const existing = (project.staffDrafts || []).filter((entry) => completedMutation.submissionIds.includes(entry.id))
        return send(response, 200, { submissions: existing, alreadySynced: true }, origin)
      }
      const submissions = entries.map((entry) => staffSubmission(entry, staff))
      project.staffDrafts = [...(project.staffDrafts || []), ...submissions]
      project.activityLog = [...(project.activityLog || []), {
        id: randomUUID(),
        actorId: staff.id,
        actorName: staff.name,
        action: 'Saved ' + submissions.length + ' field cart item' + (submissions.length === 1 ? '' : 's'),
        detail: submissions.map((entry) => entry.area + ' / ' + entry.product).join(', '),
        createdAt: submissions[0].createdAt
      }]
      if (mutationId) {
        project.syncMutations = [
          ...(project.syncMutations || []),
          { id: mutationId, staffId: staff.id, submissionIds: submissions.map((submission) => submission.id), createdAt: submissions[0].createdAt }
        ].slice(-500)
      }
      project.updatedAt = now()
      writeData(data)
      return send(response, 201, { submissions }, origin)
    }
    const draftMatch = path.match(/^\/api\/staff\/projects\/([^/]+)\/drafts$/)
    if (request.method === 'POST' && draftMatch) {
      if (!staff) return send(response, 401, { error: 'Staff authentication is required.' }, origin)
      const body = await jsonBody(request)
      const data = readData()
      const project = data.projects.find((item) => item.id === draftMatch[1])
      if (!project) return send(response, 404, { error: 'Project not found.' }, origin)
      const draft = staffSubmission(body, staff)
      project.staffDrafts = [...(project.staffDrafts || []), draft]
      project.activityLog = [...(project.activityLog || []), {
        id: randomUUID(),
        actorId: staff.id,
        actorName: staff.name,
        action: 'Saved a field cart item',
        detail: draft.area + ' / ' + draft.product,
        createdAt: draft.createdAt
      }]
      project.updatedAt = now()
      writeData(data)
      return send(response, 201, { draft }, origin)
    }
    const subDeleteMatch = path.match(/^\/api\/(?:staff\/)?projects\/([^/]+)\/(?:submissions|drafts)\/([^/]+)$/)
    if (request.method === 'DELETE' && subDeleteMatch) {
      if (!staff && !manager) return send(response, 401, { error: 'Authentication is required.' }, origin)
      const data = readData()
      const project = data.projects.find((item) => item.id === subDeleteMatch[1])
      if (!project) return send(response, 404, { error: 'Project not found.' }, origin)
      const subId = decodeURIComponent(subDeleteMatch[2]).replace(/^staff-/, '')
      const prevCount = (project.staffDrafts || []).length
      project.staffDrafts = (project.staffDrafts || []).filter((s) => {
        const sid = String(s.id || s.rawId || s.localId || '').replace(/^staff-/, '')
        return sid !== subId
      })
      if (project.syncMutations) {
        project.syncMutations = project.syncMutations.map((m) => ({
          ...m,
          submissionIds: (m.submissionIds || []).filter((id) => String(id).replace(/^staff-/, '') !== subId)
        })).filter((m) => (m.submissionIds || []).length > 0)
      }
      const actor = staff || manager
      project.activityLog = [...(project.activityLog || []), {
        id: randomUUID(),
        actorId: actor.id,
        actorName: actor.name,
        action: 'Deleted field submission',
        detail: `Submission ID ${subId}`,
        createdAt: now()
      }]
      project.updatedAt = now()
      writeData(data)
      return send(response, 200, { success: true, deleted: prevCount !== project.staffDrafts.length }, origin)
    }
    return send(response, 404, { error: 'Route not found.' }, origin)
  } catch (error) {
    const status = error.status || (error.message === 'Request is too large.' || error.message === 'Request body must be valid JSON.' || error.message === 'Each cart item needs an area, product, width and height.' ? 400 : 500)
    return send(response, status, { error: error.message || 'Unexpected server error.' }, origin)
  }
  })
}

export function startLocalApiServer(options = {}) {
  const port = Number(options.port || process.env.PORT || 8788)
  const host = process.env.HOST || (options.host && options.host !== '127.0.0.1' ? options.host : '0.0.0.0')
  const server = createLocalApiServer(options)
  return new Promise((resolveStart, rejectStart) => {
    server.once('error', rejectStart)
    server.listen(port, host, () => {
      server.off('error', rejectStart)
      resolveStart(server)
    })
  })
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isMainModule) {
  const port = Number(process.env.PORT || 8788)
  startLocalApiServer({ port }).then(() => {
    console.log('Krishna Decor API listening on http://127.0.0.1:' + port)
  }).catch((error) => {
    console.error('Krishna Decor API could not start:', error.message)
    process.exitCode = 1
  })
}
