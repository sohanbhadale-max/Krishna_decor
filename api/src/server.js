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

function configure(options = {}) {
  dataDirectory = resolve(options.dataDirectory || process.env.KD_DATA_DIR || defaultDataDirectory)
  dataFile = join(dataDirectory, 'krishna-decor.json')
  const configuredOrigins = Array.isArray(options.allowedOrigins)
    ? options.allowedOrigins
    : String(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '').split(',')
  allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins.map((origin) => String(origin).trim()).filter(Boolean)])]
  sessions.clear()
}

function initialData() {
  return { users: [], projects: [] }
}

function readData() {
  if (!existsSync(dataFile)) return initialData()
  try {
    const stored = JSON.parse(readFileSync(dataFile, 'utf8'))
    return {
      users: Array.isArray(stored.users) ? stored.users : [],
      projects: Array.isArray(stored.projects) ? stored.projects : []
    }
  } catch {
    throw new Error('The local data file cannot be read. Restore api/data/krishna-decor.json from a backup.')
  }
}

function writeData(data) {
  mkdirSync(dataDirectory, { recursive: true })
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
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) return null
  const user = readData().users.find((item) => item.id === session.userId)
  if (!user || (requiredRole && user.role !== requiredRole)) return null
  return user
}

function newSession(user) {
  const token = randomBytes(32).toString('base64url')
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 12 })
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
  return {
    id: randomUUID(),
    name: cleanText(values.name, 100) || 'Untitled project',
    status: 'Needs site details',
    createdAt: now(),
    updatedAt: now(),
    assignedStaffId: '',
    customer: { name: cleanText(values.customerName, 100), address: '', location: '', reference: '', visitDate: '', sitePhoto: '' },
    areas: [],
    quotations: [],
    payments: [],
    staffDrafts: [],
    activityLog: [],
    syncMutations: []
  }
}

function safePatch(body) {
  const allowed = ['name', 'status', 'assignedStaffId', 'customer', 'areas', 'quotations', 'payments']
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
  for (const list of ['areas', 'quotations', 'payments']) {
    if (patch[list] && !Array.isArray(patch[list])) delete patch[list]
  }
  return patch
}

function quotationTotal(quotation) {
  return (quotation?.items || []).reduce((sum, item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    return sum + amount + amount * ((Number(item.gst) || 0) / 100)
  }, 0)
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

function staffSubmission(values, staff) {
  const submission = {
    id: randomUUID(),
    staffId: staff.id,
    staffName: staff.name,
    status: 'Saved',
    createdAt: now(),
    area: cleanText(values.area, 100),
    width: Number(values.width) || 0,
    height: Number(values.height) || 0,
    unit: ['in', 'ft', 'm', 'cm'].includes(values.unit) ? values.unit : 'in',
    product: cleanText(values.product, 100),
    notes: cleanText(values.notes, 500)
  }
  if (!submission.area || !submission.product || submission.width <= 0 || submission.height <= 0) {
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
      const name = cleanText(body.name, 100).toLowerCase()
      const password = String(body.password || '')
      const user = readData().users.find((item) => item.role === role && String(item.name || '').toLowerCase() === name)
      if (!user || !passwordMatches(password, user.passwordHash)) {
        return send(response, 401, { error: 'User name or password is incorrect.' }, origin)
      }
      return send(response, 200, newSession(user), origin)
    }
    if (request.method === 'POST' && path === '/api/auth/logout') {
      const token = String(request.headers.authorization || '').replace(/^Bearer\s+/, '')
      sessions.delete(token)
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
      const project = projectShape(await jsonBody(request))
      data.projects.unshift(project)
      writeData(data)
      return send(response, 201, { project }, origin)
    }
    const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/)
    if (request.method === 'PUT' && projectMatch) {
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
      if (!name || password.length < 8) return send(response, 400, { error: 'Enter a staff name and a password of at least 8 characters.' }, origin)
      if (data.users.some((item) => item.role === 'staff' && String(item.name || '').toLowerCase() === name.toLowerCase())) {
        return send(response, 409, { error: 'A staff account already uses this name.' }, origin)
      }
      const user = { id: randomUUID(), name, role: 'staff', passwordHash: hashPassword(password), createdAt: now() }
      data.users.push(user)
      writeData(data)
      return send(response, 201, { staff: publicUser(user) }, origin)
    }
    const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/)
    if (request.method === 'DELETE' && staffMatch) {
      if (!manager) return send(response, 401, { error: 'Manager authentication is required.' }, origin)
      const data = readData()
      const index = data.users.findIndex((item) => item.id === staffMatch[1] && item.role === 'staff')
      if (index < 0) return send(response, 404, { error: 'Staff member not found.' }, origin)
      const [removed] = data.users.splice(index, 1)
      for (const [token, session] of sessions) if (session.userId === removed.id) sessions.delete(token)
      writeData(data)
      return send(response, 204, {}, origin)
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
