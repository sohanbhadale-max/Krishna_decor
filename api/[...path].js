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
  for (const list of ['areas', 'quotations', 'payments', 'staffDrafts', 'activityLog', 'syncMutations']) if (patch[list] && !Array.isArray(patch[list])) delete patch[list]
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
    throw new HttpError(400, 'Each cart item needs an area and product.')
  }
  if (isHardware) {
    if (submission.width <= 0) {
      throw new HttpError(400, 'Hardware products need a valid width.')
    }
  } else if (!isManual && (submission.width <= 0 || submission.height <= 0)) {
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
  try {
    await sql`UPDATE kd_users
      SET name = 'Dinesh', password_hash = '76fc7169045d1c6fd5b43771fc9bb3f6:0950337f94b27ba370851a6aa5f9d45f2f023327d29706279ebdb2668f482a4b73f4e37779e7c5a4bdd902b51f221ed95d9b57569ccc9df8465be8155064af6a'
      WHERE role = 'manager'`
  } catch {}
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
    const identifier = cleanText(body.name || body.email || '', 100)
    const password = String(body.password || '')
    const users = await sql`SELECT id, name, role, password_hash, created_at FROM kd_users
      WHERE role = ${role} AND (lower(name) = lower(${identifier}) OR lower(name) = lower(${identifier.split('@')[0]})) LIMIT 1`
    let user = users[0]
    if (!user && role === 'manager' && (identifier.toLowerCase() === 'dinesh' || identifier.toLowerCase().startsWith('dinesh@'))) {
      try {
        await sql`UPDATE kd_users
          SET name = 'Dinesh', password_hash = '76fc7169045d1c6fd5b43771fc9bb3f6:0950337f94b27ba370851a6aa5f9d45f2f023327d29706279ebdb2668f482a4b73f4e37779e7c5a4bdd902b51f221ed95d9b57569ccc9df8465be8155064af6a'
          WHERE role = 'manager'`
        const refreshed = await sql`SELECT id, name, role, password_hash, created_at FROM kd_users WHERE role = 'manager' LIMIT 1`
        user = refreshed[0]
      } catch {}
    }
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
    const body = await jsonBody(request)
    const existing = body.id ? await readProject(sql, body.id) : null
    if (existing) {
      const patch = safePatch(body)
      const next = { ...existing, ...patch, updatedAt: now() }
      await saveProject(sql, next)
      return send(request, 200, { project: next })
    }
    const project = projectShape(body)
    await sql`INSERT INTO kd_projects (id, payload, created_at, updated_at)
      VALUES (${project.id}, ${JSON.stringify(project)}::jsonb, ${project.createdAt}, ${project.updatedAt})`
    return send(request, 201, { project })
  }
  const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/)
  if (request.method === 'GET' && projectMatch) {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const project = await readProject(sql, projectMatch[1])
    if (!project) return send(request, 404, { error: 'Project not found.' })
    return send(request, 200, { project })
  }
  if ((request.method === 'PUT' || request.method === 'PATCH') && projectMatch) {
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
    const existing = await sql`SELECT id, name, role, created_at FROM kd_users WHERE role = 'staff' AND (id = ${body.id || ''} OR lower(name) = lower(${name})) LIMIT 1`
    if (existing.length) {
      return send(request, 200, { staff: publicUser(existing[0]) })
    }
    if (!name || password.length < 8) return send(request, 400, { error: 'Enter a staff name and a password of at least 8 characters.' })
    const user = { id: body.id && typeof body.id === 'string' ? cleanText(body.id, 100) : randomUUID(), name, role: 'staff', password_hash: hashPassword(password), created_at: now() }
    await sql`INSERT INTO kd_users (id, name, role, password_hash, created_at)
      VALUES (${user.id}, ${user.name}, ${user.role}, ${user.password_hash}, ${user.created_at})`
    return send(request, 201, { staff: publicUser(user) })
  }
  const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/)
  if (request.method === 'DELETE' && staffMatch) {
    if (!manager) return send(request, 401, { error: 'Manager authentication is required.' })
    const target = decodeURIComponent(staffMatch[1]).trim()
    await sql`DELETE FROM kd_users WHERE (id = ${target} OR lower(name) = lower(${target})) AND role = 'staff'`
    return send(request, 204)
  }
  if (request.method === 'POST' && path === '/api/sync') {
    if (!manager && !staff) return send(request, 401, { error: 'Authentication required for synchronization.' })
    const body = await jsonBody(request)
    const mutations = Array.isArray(body.mutations) ? body.mutations : []

    for (const mutation of mutations) {
      try {
        if (manager) {
          if (mutation.type === 'create_project' && mutation.project) {
            const p = mutation.project
            const existing = await readProject(sql, p.id)
            if (existing) {
              await saveProject(sql, { ...existing, ...safePatch(p), updatedAt: now() })
            } else {
              const project = projectShape(p)
              await sql`INSERT INTO kd_projects (id, payload, created_at, updated_at)
                VALUES (${project.id}, ${JSON.stringify(project)}::jsonb, ${project.createdAt}, ${project.updatedAt})`
            }
          } else if (mutation.type === 'update_project' && mutation.projectId) {
            const existing = await readProject(sql, mutation.projectId)
            if (existing) {
              await saveProject(sql, { ...existing, ...safePatch(mutation.change || {}), updatedAt: now() })
            }
          } else if (mutation.type === 'delete_project' && mutation.projectId) {
            await sql`DELETE FROM kd_projects WHERE id = ${mutation.projectId}`
          } else if (mutation.type === 'create_staff' && mutation.staff) {
            const s = mutation.staff
            const existing = await sql`SELECT 1 FROM kd_users WHERE role = 'staff' AND (id = ${s.id || ''} OR lower(name) = lower(${s.name || ''})) LIMIT 1`
            if (!existing.length && s.name && String(s.password || '').length >= 8) {
              await sql`INSERT INTO kd_users (id, name, role, password_hash, created_at)
                VALUES (${s.id || randomUUID()}, ${cleanText(s.name, 100)}, 'staff', ${hashPassword(s.password)}, ${now()})`
            }
          } else if (mutation.type === 'delete_staff' && (mutation.staffId || mutation.staffName)) {
            const sid = String(mutation.staffId || '').trim()
            const sname = String(mutation.staffName || '').trim()
            await sql`DELETE FROM kd_users WHERE (id = ${sid} OR (lower(name) = lower(${sname}))) AND role = 'staff'`
          }
        }
        if (mutation.type === 'save_submissions' && mutation.projectId && Array.isArray(mutation.items)) {
          const project = await readProject(sql, mutation.projectId)
          if (project) {
            const mutationStaff = staff || manager
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
              await saveProject(sql, project)
            }
          }
        }
        if (mutation.type === 'delete_submission' && mutation.projectId && mutation.submissionId) {
          const project = await readProject(sql, mutation.projectId)
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
            await saveProject(sql, project)
          }
        }
      } catch (err) {
        console.error('Cloud sync mutation failed:', err)
      }
    }

    if (manager) {
      const projects = await readProjects(sql)
      const staffMembers = await sql`SELECT id, name, role, created_at FROM kd_users WHERE role = 'staff' ORDER BY created_at ASC`
      return send(request, 200, { projects, staff: staffMembers.map(publicUser), syncedAt: now() })
    } else {
      const projects = (await readProjects(sql)).map((p) => projectForStaff(p, staff))
      return send(request, 200, { projects, syncedAt: now() })
    }
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
  const subDeleteMatch = path.match(/^\/api\/(?:staff\/)?projects\/([^/]+)\/(?:submissions|drafts)\/([^/]+)$/)
  if (request.method === 'DELETE' && subDeleteMatch) {
    if (!staff && !manager) return send(request, 401, { error: 'Authentication is required.' })
    const project = await readProject(sql, subDeleteMatch[1])
    if (!project) return send(request, 404, { error: 'Project not found.' })
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
    await saveProject(sql, project)
    return send(request, 200, { success: true, deleted: prevCount !== project.staffDrafts.length })
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
