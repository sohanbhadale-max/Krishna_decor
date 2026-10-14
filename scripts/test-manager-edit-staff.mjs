// Automated test verifying Manager App editing and syncing of Staff App submissions

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

async function run() {
  console.log('\n=== TESTING MANAGER EDITING OF STAFF SUBMISSIONS ===\n')

  // 1. Authenticate manager
  const managerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name: 'sohan', email: 'sohanbhadale1234@gmail.com', password: '12345678', role: 'manager' })
  })
  assert(managerLogin.ok && managerLogin.data.token, 'Manager signed in')
  const managerToken = managerLogin.data.token
  const managerHeaders = { Authorization: 'Bearer ' + managerToken }

  // 2. Create and authenticate staff
  const staffName = 'TestFieldStaff_' + Date.now().toString(36)
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
  const staffUser = staffLogin.data.user

  // 3. Create a project
  const testProjectId = 'proj-edit-test-' + Date.now()
  const createProj = await request('/projects', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      id: testProjectId,
      name: 'Edit Staff Test Residence',
      status: 'Active',
      customer: { name: 'Vikram Joshi', location: 'Bandra West' },
      areas: [
        { id: 'area-1', name: 'Living Room', width: 144, height: 120, unit: 'in', products: [] }
      ],
      quotations: [],
      payments: [],
      staffDrafts: []
    })
  })
  assert(createProj.ok, 'Project created for test')

  // 4. Staff submits an item to the project
  const submissionMutationId = 'mut-staff-' + Date.now().toString(36)
  const staffSubmit = await request(`/staff/projects/${testProjectId}/submissions`, {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify({
      mutationId: submissionMutationId,
      items: [
        {
          area: 'Living Room',
          product: 'American curtains',
          width: '48',
          height: '84',
          unit: 'in',
          clampType: 'Wall clamp 1x',
          notes: 'Initial measurement by technician'
        }
      ]
    })
  })
  assert(staffSubmit.ok && staffSubmit.data.submissions.length === 1, 'Staff submission posted to server')

  // 5. Manager fetches project and inspects staffDrafts
  const getProj1 = await request(`/projects/${testProjectId}`, { headers: managerHeaders })
  const projData1 = getProj1.data.project
  assert(projData1.staffDrafts && projData1.staffDrafts.length === 1, 'Manager fetched project with 1 staffDraft')
  const draftBefore = projData1.staffDrafts[0]
  assert(draftBefore.width === 48 && draftBefore.height === 84, 'Draft initial dimensions are 48 x 84 in')

  // 6. Simulate Manager Editing the Staff Draft (matching saveEditedMaterial logic in main.jsx)
  console.log('\nSimulating Manager Edit in Manager App:')
  const updatedSubmission = {
    id: 'staff-' + draftBefore.id,
    rawId: draftBefore.id,
    isStaff: true,
    area: 'Living Room',
    product: 'American curtains',
    width: 72,       // Changed from 48 to 72
    height: 96,      // Changed from 84 to 96
    unit: 'in',
    clampType: 'Ceiling clamp 2x', // Changed clamp
    quantity: 11.36, // Calculated quantity for 72 x 96
    unitPrice: 350,  // Manager sets MRP
    gst: 18,
    note: 'Manager corrected: 72 x 96 in with ceiling clamp'
  }

  const targetId = updatedSubmission.rawId || updatedSubmission.id
  const nextDrafts = (projData1.staffDrafts || []).map((draft) => {
    if (draft.id === targetId || ('staff-' + draft.id) === targetId) {
      return {
        ...draft,
        area: updatedSubmission.area || draft.area,
        product: updatedSubmission.product || draft.product,
        width: Number(updatedSubmission.width),
        height: Number(updatedSubmission.height),
        unit: updatedSubmission.unit,
        clampType: updatedSubmission.clampType,
        quantity: Number(updatedSubmission.quantity),
        unitPrice: Number(updatedSubmission.unitPrice),
        gst: Number(updatedSubmission.gst),
        notes: updatedSubmission.note
      }
    }
    return draft
  })

  // Manager saves via PATCH
  const patchRes = await request(`/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: managerHeaders,
    body: JSON.stringify({ staffDrafts: nextDrafts })
  })
  assert(patchRes.ok, 'Manager PATCH project with updated staffDrafts succeeded')

  // 7. Verify Manager re-fetch sees updated values
  const getProj2 = await request(`/projects/${testProjectId}`, { headers: managerHeaders })
  const projData2 = getProj2.data.project
  const draftAfter = projData2.staffDrafts[0]
  assert(draftAfter.width === 72, 'Persisted width is updated to 72')
  assert(draftAfter.height === 96, 'Persisted height is updated to 96')
  assert(draftAfter.clampType === 'Ceiling clamp 2x', 'Persisted clampType is updated')
  assert(draftAfter.unitPrice === 350, 'Persisted unitPrice is 350')
  assert(draftAfter.notes === 'Manager corrected: 72 x 96 in with ceiling clamp', 'Persisted notes updated')

  // 8. Verify Staff app re-fetch also sees the updated measurements
  const staffGet = await request('/staff/projects', { headers: staffHeaders })
  const staffProj = (staffGet.data.projects || []).find((p) => p.id === testProjectId)
  assert(staffProj && staffProj.staffDrafts && staffProj.staffDrafts.length === 1, 'Staff app fetches project')
  const staffViewDraft = staffProj.staffDrafts[0]
  assert(staffViewDraft.width === 72 && staffViewDraft.height === 96, 'Staff app sees updated dimensions 72 x 96')

  // 9. Verify Manager Deleting the staff draft
  console.log('\nSimulating Manager Deleting Staff Draft:')
  const remainingDrafts = (projData2.staffDrafts || []).filter((d) => d.id !== draftAfter.id && ('staff-' + d.id) !== draftAfter.id)
  const deletePatchRes = await request(`/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: managerHeaders,
    body: JSON.stringify({ staffDrafts: remainingDrafts })
  })
  assert(deletePatchRes.ok, 'Manager PATCH to delete staff draft succeeded')

  const getProj3 = await request(`/projects/${testProjectId}`, { headers: managerHeaders })
  assert(getProj3.data.project.staffDrafts.length === 0, 'Staff draft successfully removed from project')

  // Clean up test project
  await request(`/projects/${testProjectId}`, { method: 'DELETE', headers: managerHeaders })
  console.log('\nCleaned up test project.\n')

  console.log(`=== SUMMARY: ${passed} passed, ${failed} failed ===`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
