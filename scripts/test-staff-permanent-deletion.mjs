import { startLocalApiServer } from '../api/src/server.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const TEST_PORT = 8798
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
  console.log('\n======================================================')
  console.log('  TESTING PERMANENT REMOVAL OF STAFF ACCOUNTS (ISRA & POOJA)')
  console.log('======================================================\n')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-staff-test-'))
  const templatePath = path.resolve('api/data/krishna-decor.json')
  fs.copyFileSync(templatePath, path.join(tempDir, 'krishna-decor.json'))

  const server = await startLocalApiServer({
    port: TEST_PORT,
    dataDirectory: tempDir
  })
  console.log(`Test API server started on ${BASE} with data directory: ${tempDir}\n`)

  try {
    // 1. Manager login
    const mgrLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinesh', password: 'KDecor2026', role: 'manager' })
    })
    assert(mgrLogin.ok && mgrLogin.data.token, 'Manager logs in successfully')
    const managerToken = mgrLogin.data.token
    const managerHeaders = { Authorization: 'Bearer ' + managerToken }

    // 2. Initial staff list should NOT have isra or pooja automatically pre-seeded
    const initialStaff = await request('/staff', { headers: managerHeaders })
    assert(initialStaff.ok, 'GET /api/staff succeeds')
    assert(!initialStaff.data.staff.some(s => ['isra', 'pooja'].includes(s.name.toLowerCase())), 'No hardcoded staff accounts pre-seeded')

    // 3. Manager creates staff accounts: isra and pooja
    const createIsra = await request('/staff', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({ name: 'isra', password: 'Password123!' })
    })
    assert(createIsra.ok && createIsra.data.staff.name === 'isra', 'Staff account "isra" created')
    const israId = createIsra.data.staff.id

    const createPooja = await request('/staff', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({ name: 'pooja', password: 'Password123!' })
    })
    assert(createPooja.ok && createPooja.data.staff.name === 'pooja', 'Staff account "pooja" created')
    const poojaId = createPooja.data.staff.id

    // Verify both are listed
    const staffList1 = await request('/staff', { headers: managerHeaders })
    assert(staffList1.data.staff.length === 2, 'Both isra and pooja are listed in staff directory')

    // 4. Test deleting "isra" via DELETE /api/staff/:id
    const delIsra = await request('/staff/' + israId, {
      method: 'DELETE',
      headers: managerHeaders
    })
    assert(delIsra.status === 204, 'DELETE /api/staff/' + israId + ' returns 204 No Content')

    // Verify isra is gone and only pooja remains
    const staffList2 = await request('/staff', { headers: managerHeaders })
    assert(staffList2.data.staff.length === 1 && staffList2.data.staff[0].name === 'pooja', 'Isra removed, only pooja remains')

    // Verify deleted staff cannot log in
    const israLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name: 'isra', password: 'Password123!', role: 'staff' })
    })
    assert(israLogin.status === 401, 'Removed staff "isra" cannot log in (401 Unauthorized)')

    // 5. Test deleting "pooja" via /api/sync mutation
    const syncDelPooja = await request('/sync', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({
        mutations: [
          { type: 'delete_staff', staffId: poojaId, staffName: 'pooja' }
        ]
      })
    })
    assert(syncDelPooja.ok, 'POST /api/sync with delete_staff mutation succeeds')
    assert(Array.isArray(syncDelPooja.data.staff) && syncDelPooja.data.staff.length === 0, 'POST /api/sync returns 0 staff after deleting pooja')

    // Verify staff list is now empty and does NOT resurrect any staff
    const staffList3 = await request('/staff', { headers: managerHeaders })
    assert(staffList3.data.staff.length === 0, 'GET /api/staff returns 0 staff accounts (no resurrection)')

    // Check raw file on disk to ensure users array only contains manager
    const diskContent = JSON.parse(fs.readFileSync(path.join(tempDir, 'krishna-decor.json'), 'utf8'))
    assert(diskContent.users.length === 1 && diskContent.users[0].role === 'manager', 'Database file on disk contains ONLY manager (no staff left)')

    // 6. Test re-adding staff after deletion
    const recreateIsra = await request('/staff', {
      method: 'POST',
      headers: managerHeaders,
      body: JSON.stringify({ name: 'isra', password: 'NewPassword123!' })
    })
    assert(recreateIsra.ok && recreateIsra.data.staff.name === 'isra', 'Manager can re-create staff account "isra" with new password')

    // 7. Delete by name: DELETE /api/staff/isra
    const delByName = await request('/staff/isra', {
      method: 'DELETE',
      headers: managerHeaders
    })
    assert(delByName.status === 204, 'DELETE /api/staff/isra (by name) returns 204 No Content')

    const staffList4 = await request('/staff', { headers: managerHeaders })
    assert(staffList4.data.staff.length === 0, 'Staff directory is empty after deleting by name')

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
      console.log('\nTest API Server stopped.')
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }

  console.log('\n======================================================')
  console.log(`  STAFF PERMANENT DELETION TEST SUMMARY`)
  console.log(`  PASSED: ${passed}`)
  console.log(`  FAILED: ${failed}`)
  console.log('======================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error during test:', err)
  process.exit(1)
})
