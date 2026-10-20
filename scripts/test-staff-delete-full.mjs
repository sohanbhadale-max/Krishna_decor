// Automated test verifying full deletion capabilities for staff-added items
import { startLocalApiServer } from '../api/src/server.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const TEST_PORT = 8799
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

async function run() {
  console.log('\n=== TESTING TOTAL DELETION OF STAFF-ADDED ITEMS ===\n')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-test-delete-'))
  // Seed with template data
  const templatePath = path.resolve('api/data/krishna-decor.json')
  fs.copyFileSync(templatePath, path.join(tempDir, 'krishna-decor.json'))

  const server = await startLocalApiServer({
    port: TEST_PORT,
    dataDirectory: tempDir
  })
  console.log(`Test API server started on ${BASE}`)

  try {
    // 1. Authenticate manager
    const managerLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinesh', email: 'dinesh@krishnadecor.local', password: 'KDecor2026', role: 'manager' })
    })
    assert(managerLogin.ok && managerLogin.data.token, 'Manager signed in')
    const managerToken = managerLogin.data.token
    const managerHeaders = { Authorization: 'Bearer ' + managerToken }

    // 2. Create and authenticate staff
    const staffName = 'DeleteTestStaff_' + Date.now().toString(36)
    const staffId = 'staff-' + Date.now().toString(36)
    await request('/staff', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({ id: staffId, name: staffName, password: 'Password123!' })
    })

    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: staffName, password: 'Password123!', role: 'staff' })
    })
    assert(staffLogin.ok && staffLogin.data.token, 'Staff signed in')
    const staffToken = staffLogin.data.token
    const staffHeaders = { Authorization: 'Bearer ' + staffToken }

    // 3. Create test project
    const testProjId = 'test-delete-' + Date.now().toString(36)
    const createProj = await request('/projects', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({
        id: testProjId,
        name: 'Deletion Test Project',
        status: 'Needs site details',
        customer: { name: 'Customer Delete Test', address: '123 Road' },
        areas: [
          { id: 'area-1', name: 'Master Bedroom', width: 60, height: 90, unit: 'in', products: [] },
          { id: 'area-2', name: 'Living Room', width: 80, height: 100, unit: 'in', products: [] }
        ],
        quotations: [],
        payments: [],
        staffDrafts: []
      })
    })
    assert(createProj.ok, 'Test project created')

    // 4. Staff adds 3 submissions (two in Master Bedroom, one in Living Room)
    const sub1Id = 'sub1-' + Date.now().toString(36)
    const sub2Id = 'sub2-' + Date.now().toString(36)
    const sub3Id = 'sub3-' + Date.now().toString(36)

    const postSubmissions = await request(`/staff/projects/${testProjId}/submissions`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        mutationId: 'mut-add-3',
        items: [
          { id: sub1Id, area: 'Master Bedroom', product: 'American curtains', width: 60, height: 90, unit: 'in', notes: 'First submission' },
          { id: sub2Id, area: 'Master Bedroom', product: 'Motorized Roller Blinds', width: 60, height: 90, unit: 'in', notes: 'Second submission' },
          { id: sub3Id, area: 'Living Room', product: 'Ripple Curtains', width: 80, height: 100, unit: 'in', notes: 'Third submission' }
        ]
      })
    })
    assert(postSubmissions.ok, '3 staff submissions posted successfully')

    // 5. Verify manager sees 3 staff drafts
    const getProj1 = await request(`/projects/${testProjId}`, { headers: managerHeaders })
    assert(getProj1.ok && getProj1.data.project.staffDrafts.length === 3, 'Manager sees 3 staff drafts')

    // 6. Test Staff App Deleting its own submission via DELETE /api/staff/projects/:projectId/submissions/:subId
    console.log('\n--- 1. Testing Staff Deleting Submission via API ---')
    const staffDeleteRes = await request(`/staff/projects/${testProjId}/submissions/${sub1Id}`, {
      method: 'DELETE',
      headers: staffHeaders
    })
    assert(staffDeleteRes.ok && staffDeleteRes.data.success, 'Staff DELETE endpoint returned success')

    const getProjAfterStaffDelete = await request(`/projects/${testProjId}`, { headers: managerHeaders })
    const remainingAfterStaff = getProjAfterStaffDelete.data.project.staffDrafts
    assert(remainingAfterStaff.length === 2, 'Project now has 2 staff drafts remaining')
    assert(!remainingAfterStaff.some(d => d.id === sub1Id), 'Deleted sub1Id is completely gone')

    // 7. Test Manager Deleting via Manager App DELETE /api/staff/projects/:projectId/submissions/:subId
    console.log('\n--- 2. Testing Manager Deleting Staff Item via Endpoint ---')
    const mgrDeleteRes = await request(`/staff/projects/${testProjId}/submissions/${sub2Id}`, {
      method: 'DELETE',
      headers: managerHeaders
    })
    assert(mgrDeleteRes.ok && mgrDeleteRes.data.success, 'Manager DELETE endpoint returned success')

    const getProjAfterMgrDelete = await request(`/projects/${testProjId}`, { headers: managerHeaders })
    const remainingAfterMgr = getProjAfterMgrDelete.data.project.staffDrafts
    assert(remainingAfterMgr.length === 1, 'Project now has 1 staff draft remaining (sub3Id)')
    assert(remainingAfterMgr[0].id === sub3Id, 'Remaining draft is sub3Id')

    // 8. Test Offline Queue Sync Mutation delete_submission via /api/sync
    console.log('\n--- 3. Testing Offline Sync Mutation "delete_submission" via /api/sync ---')
    const syncDeleteRes = await request('/sync', {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        mutations: [
          { type: 'delete_submission', projectId: testProjId, submissionId: sub3Id }
        ]
      })
    })
    assert(syncDeleteRes.ok, '/api/sync processed delete_submission mutation')

    const getProjAfterSyncDelete = await request(`/projects/${testProjId}`, { headers: managerHeaders })
    const remainingAfterSync = getProjAfterSyncDelete.data.project.staffDrafts
    assert(remainingAfterSync.length === 0, 'Project now has 0 staff drafts remaining — all totally deleted')

    // 9. Test Manager App simulated local logic:
    // - matchesStaffDraft distinction
    // - removeStaffMaterial cleaning staffDrafts and areas
    console.log('\n--- 4. Testing Manager App Deletion Matching & Area Cascade ---')
    // Add a submission for Living Room
    const sub4Id = 'sub4-' + Date.now().toString(36)
    await request(`/staff/projects/${testProjId}/submissions`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        items: [
          { id: sub4Id, area: 'Living Room', product: 'American curtains', width: 80, height: 100, unit: 'in' }
        ]
      })
    })

    const getProjBeforeAreaDelete = await request(`/projects/${testProjId}`, { headers: managerHeaders })
    assert(getProjBeforeAreaDelete.data.project.staffDrafts.length === 1, '1 draft in Living Room')

    // Delete 'Living Room' area with cascade cleaning staffDrafts
    const currentProj = getProjBeforeAreaDelete.data.project
    const nextAreas = currentProj.areas.filter(a => a.name !== 'Living Room')
    const nextDrafts = currentProj.staffDrafts.filter(d => (d.area || '').toLowerCase() !== 'living room')

    const patchAreaDelete = await request(`/projects/${testProjId}`, {
      method: 'PATCH',
      headers: managerHeaders,
      body: JSON.stringify({ areas: nextAreas, staffDrafts: nextDrafts })
    })
    assert(patchAreaDelete.ok, 'Manager deleted area and cascaded staff drafts')

    const getProjAfterAreaDelete = await request(`/projects/${testProjId}`, { headers: managerHeaders })
    assert(getProjAfterAreaDelete.data.project.areas.length === 1, 'Only Master Bedroom remaining in areas')
    assert(getProjAfterAreaDelete.data.project.staffDrafts.length === 0, 'No orphaned staff drafts remaining')

    // Cleanup test project
    await request(`/projects/${testProjId}`, { method: 'DELETE', headers: managerHeaders })
    console.log('\nCleaned up test project.')
  } finally {
    server.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
