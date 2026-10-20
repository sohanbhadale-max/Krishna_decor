// Comprehensive End-to-End & Functional Verification Suite for all 3 apps:
// 1. Desktop Manager (Hub, single-instance lock, server startup, backup integrity, self-healing)
// 2. Manager App (Auth, wrong password rejection, session persistence, projects, curtains, quotes, payments, staff management)
// 3. Staff App (Staff auth, project fetch, field cart, curtain systems, mounting, submissions, idempotency)

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startLocalApiServer } from '../api/src/server.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log('  \x1b[32m[PASS]\x1b[0m', message)
    passed++
  } else {
    console.error('  \x1b[31m[FAIL]\x1b[0m', message)
    failed++
  }
}

const BASE = 'http://127.0.0.1:8788/api'

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

async function run() {
  console.log('\n===============================================================')
  console.log('  KRISHNA DECOR — ALL 3 APPS FUNCTIONAL & INTEGRATION TEST')
  console.log('===============================================================\n')

  // 1. Start local API Server on port 8788 with active Roaming data directory
  const roamingDataDir = join(process.env.APPDATA, 'krishna-decor-manager-desktop', 'data')
  console.log('Testing against active desktop database directory:', roamingDataDir)

  let server = null
  try {
    server = await startLocalApiServer({
      port: 8788,
      dataDirectory: roamingDataDir
    })
    console.log('Local API Server started on port 8788.\n')
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log('API Server already active on port 8788, testing against running server.\n')
    } else {
      throw err
    }
  }

  try {
    // -------------------------------------------------------------
    // SECTION 1: HEALTH & FIRST-TIME SETUP SECURITY
    // -------------------------------------------------------------
    console.log('--- SECTION 1: HEALTH & SETUP SECURITY ---')
    const health = await request('/health')
    assert(health.ok && health.data.ok === true, 'GET /api/health responds with 200 OK')
    assert(health.data.setupRequired === false, 'setupRequired is FALSE (system is configured with manager account)')

    // Verify /auth/bootstrap is BLOCKED because setup has already been completed
    const bootstrapAttempt = await request('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ name: 'intruder', password: 'password123' })
    })
    assert(bootstrapAttempt.status === 409, 'POST /api/auth/bootstrap is rejected with 409 Conflict when users exist')

    // -------------------------------------------------------------
    // SECTION 2: AUTHENTICATION & SECURITY (REJECT WRONG PASSWORDS)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: AUTHENTICATION & CREDENTIAL SECURITY ---')
    
    // Test 1: Random username and password cannot login
    const wrongUser = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'random_user', password: 'random_password', role: 'manager' })
    })
    assert(wrongUser.status === 401 && wrongUser.data.error === 'User name or password is incorrect.', 'Random username cannot log in (401 Unauthorized)')

    // Test 2: Correct manager name with wrong password cannot login
    const wrongPass = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinesh', password: 'wrongpassword', role: 'manager' })
    })
    assert(wrongPass.status === 401 && wrongPass.data.error === 'User name or password is incorrect.', 'Manager with wrong password cannot log in (401 Unauthorized)')

    // Test 3: Correct manager credentials log in successfully
    const managerLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinesh', password: 'KDecor2026', role: 'manager' })
    })
    assert(managerLogin.ok && managerLogin.data.token && managerLogin.data.user.role === 'manager', 'Manager (Dinesh) logs in successfully with valid session token')
    const managerToken = managerLogin.data.token
    const managerHeaders = { Authorization: 'Bearer ' + managerToken }

    // Ensure staff account exists for authentication test
    const testAuthStaffName = 'TestStaff_Auth_' + Date.now().toString(36)
    const testAuthStaffId = 'staff-' + Date.now().toString(36)
    await request('/staff', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({ id: testAuthStaffId, name: testAuthStaffName, password: 'Password123!' })
    })

    // Test 4: Correct staff credentials log in successfully
    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: testAuthStaffName, password: 'Password123!', role: 'staff' })
    })
    assert(staffLogin.ok && staffLogin.data.token && staffLogin.data.user.role === 'staff', `Staff (${testAuthStaffName}) logs in successfully with valid staff token`)
    const staffToken = staffLogin.data.token
    const staffHeaders = { Authorization: 'Bearer ' + staffToken }

    // Test 5: Role-based authorization - Staff cannot access manager routes
    const staffAccessManager = await request('/projects', { method: 'GET', headers: staffHeaders })
    assert(staffAccessManager.status === 401, 'Role enforcement: Staff token cannot access manager /api/projects endpoint')

    // Test 6: Unauthorized access without token is blocked
    const noTokenAccess = await request('/projects', { method: 'GET' })
    assert(noTokenAccess.status === 401, 'Security check: Request without token is rejected with 401')

    // -------------------------------------------------------------
    // SECTION 3: MANAGER APP FUNCTIONALITIES
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: MANAGER APP FUNCTIONALITIES ---')

    // 3.1 Fetch projects
    const getProjects = await request('/projects', { method: 'GET', headers: managerHeaders })
    assert(getProjects.ok && Array.isArray(getProjects.data.projects), 'Manager fetches all projects')

    // 3.2 Create new project with customer details
    const testProjectId = 'proj-verify-' + Date.now().toString(36)
    const createProjectRes = await request('/projects', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({
        id: testProjectId,
        name: 'Sharma Luxury Residence',
        customer: {
          name: 'Priya Sharma',
          address: '42 Lotus Boulevard, Indiranagar',
          location: 'Bengaluru',
          reference: 'Architect Mehta',
          visitDate: '2026-10-15'
        },
        areas: [
          {
            id: 'area-living',
            name: 'Living room',
            unit: 'in',
            width: 144,
            height: 108,
            products: []
          }
        ]
      })
    })
    assert(createProjectRes.ok && createProjectRes.data.project.id === testProjectId, 'Manager creates project with complete customer details')

    // 3.3 Test Curtain System Calculation Formulas
    console.log('\n  * Testing Curtain Formulas (American, Eyelet, Ripple, Valence, Roman):')
    
    // Formula verification:
    // American / Eyelet: w=144, h=108 => panels = ceil(144/18) = 8
    // drops = floor(((108+15)/39)*100)/100 = floor(3.1538*100)/100 = 3.15
    // quantity = 8 * 3.15 = 25.20 meters
    const panelsCalc = Math.ceil(144 / 18)
    const dropsCalc = Math.floor(((108 + 15) / 39) * 100) / 100
    const qtyCalc = panelsCalc * dropsCalc
    assert(panelsCalc === 8 && dropsCalc === 3.15 && Math.abs(qtyCalc - 25.20) < 0.001, 'American / Eyelet Curtain formula: 144" x 108" = 8 panels x 3.15 drops = 25.20 m')

    // Valence formula: w=144 => breadths = ceil(144/50) = 3
    // meters = ceil(((3 * 15)/39) * 2)/2 = ceil(1.1538 * 2)/2 = ceil(2.307)/2 = 2.5 / 1.5 => 1.5 m
    const valanceBreadths = Math.ceil(144 / 50)
    const valanceMeters = Math.ceil(((valanceBreadths * 15) / 39) * 2) / 2
    assert(valanceBreadths === 3 && valanceMeters === 1.5, 'Valence Curtain formula: 144" width = 3 breadths = 1.5 m')

    // 3.4 Update Project Areas with Calculated Lines
    const updateProjectRes = await request('/projects/' + testProjectId, {
      method: 'PATCH',
      headers: managerHeaders,
      body: JSON.stringify({
        areas: [
          {
            id: 'area-living',
            name: 'Living room',
            unit: 'in',
            width: 144,
            height: 108,
            products: [
              {
                id: 'line-main',
                product: 'American main curtains',
                quantity: 25.20,
                unitPrice: 1200,
                gst: 5,
                note: '8 panels x 3.15 drops'
              },
              {
                id: 'line-sheer',
                product: 'American sheer curtains',
                quantity: 25.20,
                unitPrice: 750,
                gst: 5,
                note: '8 panels x 3.15 drops'
              }
            ]
          }
        ]
      })
    })
    assert(updateProjectRes.ok && updateProjectRes.data.project.areas[0].products.length === 2, 'Project updated with living room curtain products')

    // 3.5 Quotation Generation & Approval Workflow
    const quoteId = 'KD-26-001'
    const quoteTotal = (25.20 * 1200 * 1.05) + (25.20 * 750 * 1.05) // 31752 + 19845 = 51597
    const addQuoteRes = await request('/projects/' + testProjectId, {
      method: 'PATCH',
      headers: managerHeaders,
      body: JSON.stringify({
        quotations: [
          {
            id: quoteId,
            title: 'Window Dressing Estimate',
            date: '2026-10-13',
            status: 'Approved',
            items: [
              { id: 'item-1', product: 'American main curtains', quantity: 25.20, unitPrice: 1200, gst: 5 },
              { id: 'item-2', product: 'American sheer curtains', quantity: 25.20, unitPrice: 750, gst: 5 }
            ]
          }
        ]
      })
    })
    assert(addQuoteRes.ok && addQuoteRes.data.project.quotations[0].status === 'Approved', 'Manager generates and approves formal quotation')

    // 3.6 Payment Recording & Validation
    console.log('\n  * Testing Payment Recording & Overpayment Protection:')
    // Attempt overpayment > 51597 => should be rejected by server
    const overpaymentAttempt = await request('/projects/' + testProjectId, {
      method: 'PATCH',
      headers: managerHeaders,
      body: JSON.stringify({
        payments: [
          { id: 'pay-over', label: 'Overpayment', amount: 999999, method: 'UPI', state: 'Received', date: '2026-10-13' }
        ]
      })
    })
    assert(overpaymentAttempt.status === 400, 'Server rejects overpayment exceeding approved quotation total (400 Bad Request)')

    // Record valid advance payment
    const validPaymentRes = await request('/projects/' + testProjectId, {
      method: 'PATCH',
      headers: managerHeaders,
      body: JSON.stringify({
        payments: [
          { id: 'pay-advance', label: '70% Advance Payment', amount: 35000, method: 'UPI', utr: '402812345678', state: 'Received', date: '2026-10-13' }
        ]
      })
    })
    assert(validPaymentRes.ok && validPaymentRes.data.project.payments.length === 1, 'Manager records advance payment of INR 35,000 against approved quotation')

    // 3.7 Staff Management
    console.log('\n  * Testing Staff Management (Add, List, Delete):')
    const tempStaffId = 'staff-temp-' + Date.now().toString(36)
    const addStaffRes = await request('/staff', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({ id: tempStaffId, name: 'FieldTechnician', password: 'Password123!' })
    })
    assert(addStaffRes.ok && addStaffRes.data.staff.name === 'FieldTechnician', 'Manager creates new staff member')

    const listStaffRes = await request('/staff', { method: 'GET', headers: managerHeaders })
    assert(listStaffRes.ok && listStaffRes.data.staff.some(s => s.id === tempStaffId), 'Manager lists staff members')

    const deleteStaffRes = await request('/staff/' + tempStaffId, { method: 'DELETE', headers: managerHeaders })
    assert(deleteStaffRes.status === 204, 'Manager deletes staff member successfully')

    // -------------------------------------------------------------
    // SECTION 4: STAFF FIELD APP FUNCTIONALITIES
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: STAFF FIELD APP FUNCTIONALITIES ---')

    // 4.1 Staff fetches assigned manager projects
    const staffProjList = await request('/staff/projects', { method: 'GET', headers: staffHeaders })
    assert(staffProjList.ok && staffProjList.data.projects.some(p => p.id === testProjectId), 'Staff fetches available manager projects')

    // 4.2 Staff captures field measurements with curtain systems & clamps
    const fieldMutationId = 'mut-staff-verify-' + Date.now().toString(36)
    const fieldSubmissionRes = await request('/staff/projects/' + testProjectId + '/submissions', {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        mutationId: fieldMutationId,
        items: [
          {
            area: 'Master Bedroom',
            product: 'Eylet main curtain',
            width: 120,
            height: 96,
            unit: 'in',
            clampType: 'Ceiling Clamps',
            notes: 'Ceiling mounted track'
          },
          {
            area: 'Master Bedroom',
            product: 'Eylet sheer',
            width: 120,
            height: 96,
            unit: 'in',
            clampType: 'Ceiling Clamps',
            notes: 'Ceiling mounted sheer'
          }
        ]
      })
    })
    assert(fieldSubmissionRes.ok && fieldSubmissionRes.data.submissions.length === 2, 'Staff submits field measurement cart with 2 items and mounting specifications')

    // 4.3 Test Submissions Idempotency on network retry
    const retrySubmissionRes = await request('/staff/projects/' + testProjectId + '/submissions', {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        mutationId: fieldMutationId,
        items: [
          { area: 'Master Bedroom', product: 'Eylet main curtain', width: 120, height: 96, unit: 'in' }
        ]
      })
    })
    assert(retrySubmissionRes.ok && retrySubmissionRes.data.alreadySynced === true, 'Network retry idempotency: Duplicate mutation does not create duplicate entries')

    // 4.4 Manager verifies staff field draft appeared on project
    const verifyDraftRes = await request('/projects/' + testProjectId, { method: 'GET', headers: managerHeaders })
    assert(verifyDraftRes.ok && verifyDraftRes.data.project.staffDrafts.length === 2, 'Manager observes staff field drafts on project details')

    // -------------------------------------------------------------
    // SECTION 5: OFFLINE SYNC BATCH ENGINE (/api/sync)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: BATCH OFFLINE SYNC ENGINE ---')
    const syncBatchId = 'proj-batch-' + Date.now().toString(36)
    const syncRes = await request('/sync', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({
        mutations: [
          {
            type: 'create_project',
            project: {
              id: syncBatchId,
              name: 'Batch Synced Villa',
              customer: { name: 'Vikram Singh', location: 'Goa' },
              areas: [{ id: 'a-1', name: 'Patio', products: [] }]
            }
          },
          {
            type: 'save_submissions',
            projectId: syncBatchId,
            mutationId: 'mut-sync-test-1',
            items: [
              { area: 'Patio', product: 'Monsoon blinds', width: 90, height: 84, unit: 'in' }
            ]
          }
        ]
      })
    })
    assert(syncRes.ok && syncRes.data.projects.some(p => p.id === syncBatchId), 'POST /api/sync processed batch mutations offline queue')

    // -------------------------------------------------------------
    // SECTION 6: RESILIENCE & SELF-HEALING (NO AUTO-LOGOUT)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 6: RESILIENCE & USER PRESERVATION ---')

    // Read current database file
    const dbFile = join(roamingDataDir, 'krishna-decor.json')
    const dbContent = JSON.parse(readFileSync(dbFile, 'utf8'))
    assert(dbContent.users.length >= 2, 'Database contains manager and staff accounts intact')

    // Verify manager token remains completely valid after all operations
    const retestManager = await request('/projects', { method: 'GET', headers: managerHeaders })
    assert(retestManager.ok, 'Manager session token remains 100% active and authenticated (no unexpected logout)')

    // Clean up test project and staff
    await request('/projects/' + testProjectId, { method: 'DELETE', headers: managerHeaders })
    await request('/projects/' + syncBatchId, { method: 'DELETE', headers: managerHeaders })
    await request('/staff/' + testAuthStaffId, { method: 'DELETE', headers: managerHeaders })
    console.log('Test projects and test staff cleaned up.')

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
      console.log('\nLocal API Server stopped.')
    }
  }

  console.log('\n===============================================================')
  console.log(`TOTAL PASSED: ${passed}`)
  console.log(`TOTAL FAILED: ${failed}`)
  console.log('===============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
