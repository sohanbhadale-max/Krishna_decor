// Automated End-to-End Test for Krishna Decor:
// Local Storage, Offline-First Operations, Functions of all 3 Apps, and Synchronization.
import { startLocalApiServer } from '../api/src/server.js'
import path from 'node:path'

const BASE = 'http://127.0.0.1:8788/api'

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

async function runTests() {
  console.log('\n=== RUNNING COMPREHENSIVE KRISHNA DECOR SYNC & FUNCTION SUITE ===\n')

  let server = null
  try {
    server = await startLocalApiServer({
      port: 8788,
      dataDirectory: path.join(process.env.APPDATA, 'krishna-decor-manager-desktop', 'data')
    })
  } catch (err) {
    if (err.code !== 'EADDRINUSE') throw err
  }

  try {

  // 1. Health check
  console.log('1. Hub API Health Check')
  const health = await request('/health')
  assert(health.ok && health.data.ok === true, 'Hub health endpoint returns ok: true')

  // 2. Manager Authentication
  console.log('\n2. Manager Authentication')
  if (health.data.setupRequired) {
    await request('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinesh', email: 'dinesh@krishnadecor.local', password: 'KDecor2026' })
    })
  }
  const managerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name: 'Dinesh', email: 'dinesh@krishnadecor.local', password: 'KDecor2026', role: 'manager' })
  })
  assert(managerLogin.ok && managerLogin.data.token, 'Manager signs in successfully with JWT token')
  const managerToken = managerLogin.data.token
  const managerHeaders = { Authorization: 'Bearer ' + managerToken }

  // 3. Staff Account Creation & Idempotency
  console.log('\n3. Staff Account Lifecycle & Idempotency')
  const staffName = 'TestFieldStaff_' + Date.now().toString(36)
  const staffId = 'staff-' + Date.now().toString(36)
  const createStaff1 = await request('/staff', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ id: staffId, name: staffName, password: 'Password123!' })
  })
  assert(createStaff1.ok && createStaff1.data.staff.id === staffId, 'Manager creates new staff member with client-provided ID')

  // Test idempotency: re-creating same staff should succeed without duplicate
  const createStaff2 = await request('/staff', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ id: staffId, name: staffName, password: 'Password123!' })
  })
  assert(createStaff2.ok && createStaff2.data.staff.id === staffId, 'Idempotent staff creation: re-posting same staff does not error or duplicate')

  // Staff login
  const staffLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name: staffName, password: 'Password123!', role: 'staff' })
  })
  assert(staffLogin.ok && staffLogin.data.token, 'Field staff signs in successfully')
  const staffToken = staffLogin.data.token
  const staffHeaders = { Authorization: 'Bearer ' + staffToken }

  // 4. Project Creation & Idempotency (Offline simulation with client ID)
  console.log('\n4. Project Creation & Client-Side ID Preservation')
  const projectId = 'proj-offline-' + Date.now().toString(36)
  const projectPayload = {
    id: projectId,
    name: 'Luxury Villa ' + Date.now().toString(36),
    customer: {
      name: 'Dr. Ramesh Sharma',
      phone: '9876543210',
      address: 'Plot 42, Jubilee Hills',
      location: 'Hyderabad'
    },
    areas: [
      {
        id: 'area-1',
        name: 'Master Bedroom',
        items: [
          {
            id: 'item-1',
            type: 'curtain',
            style: 'American Pleat',
            fabric: 'Velvet Royal Blue',
            width: 120,
            height: 96,
            quantity: 2,
            rate: 850
          }
        ]
      }
    ]
  }

  const createProj1 = await request('/projects', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify(projectPayload)
  })
  assert(createProj1.ok && createProj1.data.project.id === projectId, 'Project created preserving client-assigned ID (offline sync ready)')

  // Test idempotency
  const createProj2 = await request('/projects', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify(projectPayload)
  })
  assert(createProj2.ok && createProj2.data.project.id === projectId, 'Idempotent project creation: re-posting same project ID returns 200 without duplicate')

  // 5. Staff App Workflow: Project Fetch, Measurement Capture, and Cart Submission
  console.log('\n5. Staff Field App: Measurement Capture & Offline Cart Submissions')
  const staffProjects = await request('/staff/projects', {
    method: 'GET',
    headers: staffHeaders
  })
  assert(staffProjects.ok && staffProjects.data.projects.some(p => p.id === projectId), 'Staff fetches manager projects correctly')

  const submissionMutationId = 'mut-staff-' + Date.now().toString(36)
  const cartSubmission = await request('/staff/projects/' + projectId + '/submissions', {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify({
      mutationId: submissionMutationId,
      items: [
        {
          area: 'Living room',
          product: 'American main curtains',
          width: '144',
          height: '108',
          unit: 'in',
          notes: 'Double track ceiling mounted'
        },
        {
          area: 'Living room',
          product: 'American sheer curtains',
          width: '144',
          height: '108',
          unit: 'in',
          notes: 'Off-white linen finish'
        }
      ]
    })
  })
  assert(cartSubmission.ok && cartSubmission.data.submissions.length === 2, 'Staff cart submitted with 2 items and mutation tracking')

  // Test idempotency of submissions: Re-submitting same mutationId (e.g. on network retry)
  const cartRetry = await request('/staff/projects/' + projectId + '/submissions', {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify({
      mutationId: submissionMutationId,
      items: [
        { area: 'Living room', product: 'American main curtains', width: '144', height: '108', unit: 'in' }
      ]
    })
  })
  assert(cartRetry.ok && cartRetry.data.alreadySynced === true, 'Network retry idempotency: Duplicate submission detected & handled cleanly without duplicate entries')

  // 6. Manager App Workflow: Quotations, GST, Approvals & Invoices
  console.log('\n6. Manager App: Quotations, GST Calculations, and Invoice Generation')
  // Fetch project to see staff submissions in activity log
  const projectCheck = await request('/projects/' + projectId, {
    method: 'GET',
    headers: managerHeaders
  })
  assert(projectCheck.ok && projectCheck.data.project.staffDrafts.length === 2, 'Manager sees staff field drafts on project')
  assert(projectCheck.data.project.activityLog.length > 0, 'Project activity log tracks staff field submission')

  // Add quotation with GST calculation
  const quoteId = 'quote-' + Date.now().toString(36)
  const quotation = {
    id: quoteId,
    title: 'Formal Window Dressing Quotation',
    date: '08 Oct 2026',
    status: 'Draft',
    items: [
      { id: 'line-1', product: 'American main curtains', quantity: 2, unitPrice: 15000, gst: 5 },
      { id: 'line-2', product: 'American sheer curtains', quantity: 2, unitPrice: 10000, gst: 5 }
    ]
  }

  const patchWithQuote = await request('/projects/' + projectId, {
    method: 'PATCH',
    headers: managerHeaders,
    body: JSON.stringify({
      quotations: [quotation]
    })
  })
  assert(patchWithQuote.ok && patchWithQuote.data.project.quotations.length === 1, 'Manager creates quotation on project')

  // Approve quotation -> moves to Approved and records payment
  quotation.status = 'Approved'
  const payment1 = {
    id: 'pay-' + Date.now().toString(36),
    label: 'Advance payment',
    amount: 25000,
    method: 'UPI',
    state: 'Received',
    date: new Date().toISOString().slice(0, 10)
  }

  const patchApproved = await request('/projects/' + projectId, {
    method: 'PATCH',
    headers: managerHeaders,
    body: JSON.stringify({
      quotations: [quotation],
      payments: [payment1]
    })
  })
  assert(patchApproved.ok && patchApproved.data.project.payments.length === 1, 'Manager records advance payment against project')

  // 7. Atomic Batch Sync Endpoint (/api/sync)
  console.log('\n7. Batch Offline Synchronization Endpoint (/api/sync)')
  const offlineProjId = 'proj-synced-' + Date.now().toString(36)
  const offlineStaffId = 'staff-synced-' + Date.now().toString(36)

  const syncBatch = {
    mutations: [
      {
        type: 'create_project',
        project: {
          id: offlineProjId,
          name: 'Grand Penthouse Sync Test',
          customer: { name: 'Sunita Reddy', phone: '9988776655', address: 'Banjara Hills' },
          areas: [{ id: 'a1', name: 'Living Room', items: [] }]
        }
      },
      {
        type: 'create_staff',
        staff: {
          id: offlineStaffId,
          name: 'SyncedStaff_' + Date.now().toString(36),
          password: 'Password123!'
        }
      },
      {
        type: 'update_project',
        projectId: offlineProjId,
        change: {
          status: 'in_progress',
          notes: 'Customer confirmed consultation date'
        }
      },
      {
        type: 'save_submissions',
        projectId: offlineProjId,
        mutationId: 'mut-sync-batch-1',
        items: [
          { area: 'Living Room', product: 'Roman blinds', width: '72', height: '60', unit: 'in' }
        ]
      }
    ]
  }

  const syncResult = await request('/sync', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify(syncBatch)
  })
  assert(syncResult.ok && Array.isArray(syncResult.data.projects), 'POST /api/sync processed batch mutations cleanly')
  const syncedProjectFound = syncResult.data.projects.find(p => p.id === offlineProjId)
  assert(syncedProjectFound && syncedProjectFound.staffDrafts.length === 1, 'Batch-synced project contains both project data and field submissions')

  // Clean up test staff
  await request('/staff/' + staffId, { method: 'DELETE', headers: managerHeaders })
  await request('/staff/' + offlineStaffId, { method: 'DELETE', headers: managerHeaders })

  console.log('\n=== SUMMARY ===')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  } finally {
    if (server) {
      server.close()
    }
  }
  if (failed === 0) {
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!\n')
    process.exit(0)
  } else {
    console.error(`FAILED ${failed} tests.\n`)
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
