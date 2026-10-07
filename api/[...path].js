import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { database, ensureSchema, projectFromRow } from './src/postgres.js'

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5173', 'http://localhost:5173',
  'http://127.0.0.1:5174', 'http://localhost:5174',
  'https://localhost', 'http://localhost', 'capacitor://localhost', 'null'
]

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function isOriginAllowed(origin) {
  return true
}

function responseHeaders(request) {
  const origin = request.headers.get('origin')
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  }
}

function send(request, status, payload = null) {
  return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers: responseHeaders(request) })
}

async function jsonBody(request) {
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > 1_000_000) throw new HttpError(400, 'Request is too large.')
  const text = await request.text()
  if (text.length > 1_000_000) throw new HttpError(400, 'Request is too large.')
  if (!text) return {}
  try { return JSON.parse(text) } catch { throw new HttpError(400, 'Request body must be valid JSON.') }
}

function now() {
  return new Date().toISOString()
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

function publicUser(user) {
  return { id: user.id, name: user.name, role: user.role, createdAt: user.created_at || user.createdAt }
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function userFromRequest(request, sql, requiredRole) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const rows = await sql`SELECT u.id, u.name, u.role, u.password_hash, u.created_at
    FROM kd_sessions AS s
    JOIN kd_users AS u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > NOW()
    LIMIT 1`
  const user = rows[0]
  if (!user || (requiredRole && user.role !== requiredRole)) return null
  return user
}

async function newSession(user, sql) {
  const token = randomBytes(32).toString('base64url')
  const createdAt = now()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  await sql`INSERT INTO kd_sessions (token_hash, user_id, expires_at, created_at)
    VALUES (${tokenHash(token)}, ${user.id}, ${expiresAt}, ${createdAt})`
  return { token, user: publicUser(user) }
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
  for (const key of allowed) if (Object.hasOwn(body, key)) patch[key] = body[key]
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
  for (const list of ['areas', 'quotations', 'payments']) if (patch[list] && !Array.isArray(patch[list])) delete patch[list]
  return patch
}

function quotationTotal(quotation) {
  return (quotation?.items || []).reduce((sum, item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    return sum + amount + amount * ((Number(item.gst) || 0) / 100)
  }, 0)
}

function validatePayments(project, payments) {
  const approvedQuote = (project.quotations || []).find((quote) => quote.status === 'Approved')
  if (!approvedQuote) throw new HttpError(400, 'Approve a quotation before recording payments.')
  const total = quotationTotal(approvedQuote)
  const currentPayments = project.payments || []
  const currentReceived = currentPayments.reduce((sum, payment) => payment.state === 'Received' ? sum + Number(payment.amount || 0) : sum, 0)
  if (payments.length > currentPayments.length && currentReceived >= total - 0.005) {
    throw new HttpError(400, 'The approved quotation has already been paid in full.')
  }
  let received = 0
  for (const payment of payments) {
    const amount = Number(payment?.amount)
    if (!Number.isFinite(amount) || amount <= 0 || payment?.state !== 'Received') {
      throw new HttpError(400, 'Each payment must be a received amount greater than zero.')
    }
    received += amount
  }
  if (received > total + 0.005) {
    throw new HttpError(400, 'Payment records cannot exceed the approved quotation total.')
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
    staffDrafts: (project.staffDrafts || []).filter((submission) => submission.staffId === user.id)
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
    throw new HttpError(400, 'Each cart item needs an area, product, width and height.')
  }
  return submission
}

async function readProjects(sql) {
  const rows = await sql`SELECT payload FROM kd_projects ORDER BY updated_at DESC`
  return rows.map(projectFromRow)
}

async function readProject(sql, id) {
  const rows = await sql`SELECT payload FROM kd_projects WHERE id = ${id} LIMIT 1`
  return rows[0] ? projectFromRow(rows[0]) : null
}

async function saveProject(sql, project) {
  await sql`UPDATE kd_projects
    SET payload = ${JSON.stringify(project)}::jsonb, updated_at = ${project.updatedAt}
    WHERE id = ${project.id}`
}

async function handle(request) {
  if (request.method === 'OPTIONS') return send(request, 204)
  const sql = database(neon)
  await ensureSchema(sql)
  const url = new URL(request.url)
  const path = url.searchParams.get('route') || url.pathname

  if (request.method === 'GET' && path === '/api/health') {
    const users = await sql`SELECT 1 FROM kd_users LIMIT 1`
    return send(request, 200, { ok: true, setupRequired: users.length === 0, storage: 'cloud', provider: 'Neon Postgres' })
  }

  if (request.method === 'POST' && path === '/api/auth/bootstrap') {
    const users = await sql`SELECT 1 FROM kd_users LIMIT 1`
    if (users.length) return send(request, 409, { error: 'Initial setup has already been completed.' })
    const body = await jsonBody(request)
    const name = cleanText(body.name, 100)
    const password = String(body.password || '')
    if (!name || password.length < 8) return send(request, 400, { error: 'Enter a user name and a password of at least 8 characters.' })
    const user = { id: randomUUID(), name, role: 'manager', password_hash: hashPassword(password), created_at: now() }
    await sql`INSERT INTO kd_users (id, name, role, password_hash, created_at)
      VALUES (${user.id}, ${user.name}, ${user.role}, ${user.password_hash}, ${user.created_at})`
    return send(request, 201, await newSession(user, sql))
  }

  if (request.method === 'POST' && path === '/api/auth/login') {
    const body = await jsonBody(request)
    const role = body.role === 'staff' ? 'staff' : 'manager'
    const name = cleanText(body.name, 100)
    const password = String(body.password || '')
    const users = await sql`SELECT id, name, role, password_hash, created_at FROM kd_users
      WHERE role = ${role} AND lower(name) = lower(${name}) LIMIT 1`
    const user = users[0]
    if (!user || !passwordMatches(password, user.password_hash)) return send(request, 401, { error: 'User name or password is incorrect.' })
    return send(request, 200, await newSession(user, sql))
  }

  if (request.method === 'POST' && path === '/api/auth/logout') {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/, '')
    if (token) await sql`DELETE FROM kd_sessions WHERE token_hash = ${tokenHash(token)}`
    return send(request, 204)
  }

  const manager = await userFromRequest(request, sql, 'manager')
  const staff = manager ? null : await userFromRequest(request, sql, 'staff')
  if (request.method === 'GET' && path === '/api/projects') {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    return send(request, 200, { projects: await readProjects(sql) })
  }
  if (request.method === 'POST' && path === '/api/projects') {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const project = projectShape(await jsonBody(request))
    await sql`INSERT INTO kd_projects (id, payload, created_at, updated_at)
      VALUES (${project.id}, ${JSON.stringify(project)}::jsonb, ${project.createdAt}, ${project.updatedAt})`
    return send(request, 201, { project })
  }
  const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/)
  if (request.method === 'PUT' && projectMatch) {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const project = await readProject(sql, projectMatch[1])
    if (!project) return send(request, 404, { error: 'Project not found.' })
    const patch = safePatch(await jsonBody(request))
    if (patch.payments) validatePayments({ ...project, quotations: patch.quotations || project.quotations }, patch.payments)
    const next = { ...project, ...patch, updatedAt: now() }
    await saveProject(sql, next)
    return send(request, 200, { project: next })
  }
  if (request.method === 'DELETE' && projectMatch) {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const result = await sql`DELETE FROM kd_projects WHERE id = ${projectMatch[1]} RETURNING id`
    if (!result.length) return send(request, 404, { error: 'Project not found.' })
    return send(request, 204)
  }
  if (request.method === 'GET' && path === '/api/staff') {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const staffMembers = await sql`SELECT id, name, role, created_at FROM kd_users WHERE role = 'staff' ORDER BY created_at ASC`
    return send(request, 200, { staff: staffMembers.map(publicUser) })
  }
  if (request.method === 'POST' && path === '/api/staff') {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const body = await jsonBody(request)
    const name = cleanText(body.name, 100)
    const password = String(body.password || '')
    if (!name || password.length < 8) return send(request, 400, { error: 'Enter a staff name and a password of at least 8 characters.' })
    const existing = await sql`SELECT id FROM kd_users WHERE role = 'staff' AND lower(name) = lower(${name}) LIMIT 1`
    if (existing.length) return send(request, 409, { error: 'A staff account already uses this name.' })
    const user = { id: randomUUID(), name, role: 'staff', password_hash: hashPassword(password), created_at: now() }
    await sql`INSERT INTO kd_users (id, name, role, password_hash, created_at)
      VALUES (${user.id}, ${user.name}, ${user.role}, ${user.password_hash}, ${user.created_at})`
    return send(request, 201, { staff: publicUser(user) })
  }
  const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/)
  if (request.method === 'DELETE' && staffMatch) {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const result = await sql`DELETE FROM kd_users WHERE id = ${staffMatch[1]} AND role = 'staff' RETURNING id`
    if (!result.length) return send(request, 404, { error: 'Staff member not found.' })
    return send(request, 204)
  }
  if (request.method === 'GET' && path === '/api/staff/projects') {
    if (!staff) return send(request, 401, { error: 'Staff authentication is required.' })
    return send(request, 200, { projects: (await readProjects(sql)).map((project) => projectForStaff(project, staff)) })
  }
  const submissionsMatch = path.match(/^\/api\/staff\/projects\/([^/]+)\/submissions$/)
  if (request.method === 'POST' && submissionsMatch) {
    if (!staff) return send(request, 401, { error: 'Staff authentication is required.' })
    const body = await jsonBody(request)
    const entries = Array.isArray(body.items) ? body.items : []
    if (!entries.length) return send(request, 400, { error: 'Add at least one item to the cart before saving.' })
    if (entries.length > 50) return send(request, 400, { error: 'Save no more than 50 cart items at one time.' })
    const project = await readProject(sql, submissionsMatch[1])
    if (!project) return send(request, 404, { error: 'Project not found.' })
    const mutationId = cleanText(body.mutationId, 120)
    const completedMutation = mutationId && (project.syncMutations || []).find((mutation) => mutation.id === mutationId && mutation.staffId === staff.id)
    if (completedMutation) {
      const existing = (project.staffDrafts || []).filter((entry) => completedMutation.submissionIds.includes(entry.id))
      return send(request, 200, { submissions: existing, alreadySynced: true })
    }
    const submissions = entries.map((entry) => staffSubmission(entry, staff))
    project.staffDrafts = [...(project.staffDrafts || []), ...submissions]
    project.activityLog = [...(project.activityLog || []), {
      id: randomUUID(), actorId: staff.id, actorName: staff.name,
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
    await saveProject(sql, project)
    return send(request, 201, { submissions })
  }
  return send(request, 404, { error: 'Route not found.' })
}

export default {
  async fetch(request) {
    try {
      return await handle(request)
    } catch (error) {
      const status = error instanceof HttpError ? error.status : error.code === '23505' ? 409 : 500
      const message = error instanceof HttpError ? error.message : status === 409 ? 'A record with those details already exists.' : 'The server could not complete this request.'
      return send(request, status, { error: message })
    }
  }
}
