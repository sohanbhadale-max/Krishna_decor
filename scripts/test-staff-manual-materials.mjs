// Automated test verifying Staff Android App manual quantity materials & optional measurements
import { startLocalApiServer } from '../api/src/server.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const TEST_PORT = 8891
const BASE = `http://127.0.0.1:${TEST_PORT}/api`

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log('  [PASS]', message)
    passed++
  } else {
    console.error('  [FAIL]', message)
    failed++
  }
}

async function request(path, options = {}) {
  const url = BASE + path
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  return { status: res.status, ok: res.ok, data }
}

const SPECIFIED_MANUAL_MATERIALS = [
  'Bed border fabric',
  'Bed back making',
  'Soft board fabric',
  'Soft board making',
  'Seating fabric',
  'Seating making',
  'Pillow fabric',
  'Pillow',
  'Mattress',
  'Wallpaper rolls',
  'Wallpaper pasting',
  'Customised wallpaper',
  'Customised wallpaper pasting',
  'Carpet',
  'Bed sheet',
  'Bed set'
]

async function run() {
  console.log('\n=== TESTING STAFF APP MANUAL QUANTITY MATERIALS & OPTIONAL MEASUREMENTS ===\n')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-test-manual-mat-'))
  const templatePath = path.resolve('api/data/krishna-decor.json')
  fs.copyFileSync(templatePath, path.join(tempDir, 'krishna-decor.json'))

  const server = await startLocalApiServer({
    port: TEST_PORT,
    dataDirectory: tempDir
  })
  console.log(`Test API server started on ${BASE}`)

  try {
    // 1. Authenticate Manager
    const mgrRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinesh', email: 'dinesh@krishnadecor.local', password: 'KDecor2026', role: 'manager' })
    })
    assert(mgrRes.ok && mgrRes.data.token, 'Manager logged in successfully')
    const mgrToken = mgrRes.data.token
    const mgrHeaders = { Authorization: `Bearer ${mgrToken}` }

    // 2. Create and authenticate Staff
    const staffName = 'FieldWorker_' + Date.now().toString(36)
    const createStaffRes = await request('/staff', {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({ name: staffName, password: 'Password123!' })
    })
    assert(createStaffRes.ok, 'Staff account created by manager')

    const staffRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: staffName, password: 'Password123!', role: 'staff' })
    })
    assert(staffRes.ok && staffRes.data.token, 'Staff logged in successfully')
    const staffToken = staffRes.data.token

    // 2. Create a test project
    const projRes = await request('/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({
        name: 'Villa 101 Manual Materials Test',
        customer: { name: 'Dr. Shah', phone: '9876543210' },
        areas: [{ name: 'Master Suite' }]
      })
    })
    assert(projRes.ok && projRes.data.project?.id, 'Test project created')
    const projectId = projRes.data.project.id

    // 3. Test non-manual product without measurements is rejected
    const nonManualSub = await request(`/staff/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{
          area: 'Master Suite',
          product: 'Roller blinds',
          width: 0,
          height: 0,
          quantity: 2
        }]
      })
    })
    assert(!nonManualSub.ok && nonManualSub.status === 400, 'Non-manual material without measurements is rejected by API')

    // 4. Test all 16 specified manual materials with optional measurements omitted and default quantity 0
    const defaultBatch = SPECIFIED_MANUAL_MATERIALS.map((mat) => ({
      area: 'Master Suite',
      product: mat,
      width: 0,
      height: 0,
      unit: 'in',
      quantity: 0
    }))

    const batchRes = await request(`/staff/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: defaultBatch,
        mutationId: 'mut-default-zero-test'
      })
    })
    assert(batchRes.ok && batchRes.data.submissions?.length === 16, `All 16 specified manual materials submitted with optional measurements omitted and default quantity 0`)

    // Verify all 16 materials stored quantity 0
    const allZero = batchRes.data.submissions.every((s) => s.quantity === 0)
    assert(allZero, 'All 16 submissions have default quantity equal to 0')

    // 5. Test manual materials with manually inputted quantity > 0 and optional measurements provided
    const customBatch = [
      {
        area: 'Master Suite',
        product: 'Mattress',
        width: 72,
        height: 78,
        unit: 'in',
        quantity: 2,
        notes: 'King size ortho'
      },
      {
        area: 'Master Suite',
        product: 'Pillow',
        width: 0,
        height: 0,
        unit: 'in',
        quantity: 6,
        notes: 'Memory foam'
      },
      {
        area: 'Master Suite',
        product: 'Wallpaper rolls',
        width: 21,
        height: 360,
        unit: 'in',
        quantity: 8,
        notes: 'Textured gold'
      }
    ]

    const customRes = await request(`/staff/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: customBatch,
        mutationId: 'mut-custom-quantities-test'
      })
    })
    assert(customRes.ok && customRes.data.submissions?.length === 3, 'Custom manual quantities with optional dimensions submitted successfully')

    const mattress = customRes.data.submissions.find(s => s.product === 'Mattress')
    assert(mattress && mattress.quantity === 2 && mattress.width === 72 && mattress.height === 78, 'Mattress has quantity 2 with optional measurements preserved')

    const pillow = customRes.data.submissions.find(s => s.product === 'Pillow')
    assert(pillow && pillow.quantity === 6 && pillow.width === 0 && pillow.height === 0, 'Pillow has quantity 6 with no measurements required')

    // 6. Test Bed sheet alternate alias ('Bedsheets')
    const bedsheetsRes = await request(`/staff/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{
          area: 'Master Suite',
          product: 'Bedsheets',
          width: 0,
          height: 0,
          quantity: 4
        }],
        mutationId: 'mut-bedsheets-alias-test'
      })
    })
    assert(bedsheetsRes.ok && bedsheetsRes.data.submissions?.[0]?.quantity === 4, 'Bedsheets alias accepted with optional measurements and manual quantity')

    // 7. Verify Manager fetches project and sees all field submissions with quantities
    const mgrProjRes = await request(`/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${mgrToken}` }
    })
    assert(mgrProjRes.ok, 'Manager retrieved project')
    const staffDrafts = mgrProjRes.data.project?.staffDrafts || []
    assert(staffDrafts.length === 20, `Manager sees all 20 staff submissions (16 default + 3 custom + 1 alias)`)

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
  } finally {
    server.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Test run failed:', err)
  process.exit(1)
})
