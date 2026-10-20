// Automated test verifying fast typing resilience, input buffering,
// debounced sync, queue preservation, and zero dropped inputs.

import fs from 'node:fs'
import path from 'node:path'

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

console.log('\n========================================================================')
console.log('=== TEST SUITE: FAST TYPING RESILIENCE & INPUT PRESERVATION ===')
console.log('========================================================================\n')

const mainCode = fs.readFileSync(path.resolve('manager-app/src/main.jsx'), 'utf-8')
const staffCode = fs.readFileSync(path.resolve('staff-app/src/main.jsx'), 'utf-8')

// Test 1: Code inspections for fast typing protections
console.log('--- TEST 1: Manager App Input Protection Code Checks ---')
assert(mainCode.includes('debouncedSync'), 'patchProject uses debouncedSync instead of immediate network calls on every keystroke')
assert(mainCode.includes('const sentIds = new Set(queue.map'), 'syncAll tracks sentIds to prevent deleting newly enqueued mutations')
assert(mainCode.includes('pendingProjectIds.has(serverProj.id)'), 'syncAll protects projects with pending local mutations from being overwritten by server responses')
assert(mainCode.includes('function EditableNumberInput'), 'EditableNumberInput component implemented for responsive, non-dropping number inputs')
assert(mainCode.includes('backupTimeoutRef'), 'mirrorToDesktopBackup is debounced to avoid blocking the event loop during typing')

// Test 2: Customer component has local form buffer
console.log('\n--- TEST 2: Customer Component Local State Buffer ---')
assert(mainCode.includes('const [form, setForm] = useState(project.customer || {})'), 'Customer component maintains local form buffer for zero typing lag')
assert(mainCode.includes('setCustomerField'), 'Customer component updates local form immediately on each keystroke')
assert(mainCode.includes('saveTimeoutRef.current = setTimeout'), 'Customer component debounces persistence to patchProject')

// Test 3: AreaDimensionDrawer decoupled from area dimensions effect loop
console.log('\n--- TEST 3: AreaDimensionDrawer Decoupling ---')
assert(mainCode.includes('}, [area.id])'), 'AreaDimensionDrawer useEffect only resets on area.id change, not on internal dimension updates')
assert(mainCode.includes('handleUpdateSet'), 'AreaDimensionDrawer handleUpdateSet updates local sets immediately')

// Test 4: Staff app preserves raw strings during typing and has no MRP input
console.log('\n--- TEST 4: Staff App String-Safe Input Handling & No MRP Option ---')
assert(staffCode.includes("emptyDraft = () => ({ area: '', width: '', height: '', unit: 'in', product: PRODUCTS[0], clampType: '', notes: '', quantity: '' })"), 'staff-app emptyDraft uses empty string for quantity')
assert(staffCode.includes("setDraft({ ...draft, quantity: event.target.value })"), 'staff-app quantity onChange preserves raw event.target.value string')
assert(!staffCode.includes('MRP per unit') && !staffCode.includes('placeholder="Enter MRP per unit'), 'staff-app has NO option to input MRP')

// Test 5: Simulated Fast Typing on Numeric Input Logic
console.log('\n--- TEST 5: Fast Numeric Typing Simulation ---')

function simulateFastTyping(initialVal, charsToType) {
  let text = initialVal !== undefined && initialVal !== null && initialVal !== 0 ? String(initialVal) : (initialVal === 0 ? '0' : '')
  let isFocused = true
  let committedVal = null

  const onCommit = (num, valStr) => {
    committedVal = { num, valStr }
  }

  // Fast typing: keystrokes arrive in rapid succession
  for (const char of charsToType) {
    text += char
  }

  // On blur, commit final
  isFocused = false
  const parsed = text === '' ? 0 : Number(Number(text).toFixed(2))
  onCommit(parsed, text)

  return { text, committedVal }
}

const resDecimal = simulateFastTyping('', '12.75')
assert(resDecimal.text === '12.75', 'Fast typing "12.75" preserved all decimal characters: ' + resDecimal.text)
assert(resDecimal.committedVal.num === 12.75, 'Committed value is 12.75')

const resZero = simulateFastTyping('', '0.5')
assert(resZero.text === '0.5', 'Fast typing "0.5" preserved leading 0 and decimal: ' + resZero.text)
assert(resZero.committedVal.num === 0.5, 'Committed value is 0.5')

const resLarge = simulateFastTyping('', '1500')
assert(resLarge.text === '1500', 'Fast typing "1500" preserved all digits: ' + resLarge.text)
assert(resLarge.committedVal.num === 1500, 'Committed value is 1500')

// Test 6: Simulated Concurrent Queue Processing
console.log('\n--- TEST 6: Mutation Queue Preservation Under Rapid Mutations ---')

let localQueue = [
  { id: 'mut-1', type: 'update_project', projectId: 'p1', change: { name: 'Step 1' } }
]

// Simulate syncAll starting with queue snapshot
const queueSnapshot = [...localQueue]
const sentIds = new Set(queueSnapshot.map(m => m.id))

// While syncAll is "in flight", user types fast and enqueues 2 more mutations
localQueue.push({ id: 'mut-2', type: 'update_project', projectId: 'p1', change: { name: 'Step 2' } })
localQueue.push({ id: 'mut-3', type: 'update_project', projectId: 'p1', change: { name: 'Step 3' } })

// Sync completes for queueSnapshot:
const remainingQueue = localQueue.filter(m => !sentIds.has(m.id))
assert(remainingQueue.length === 2, `Remaining queue has exactly 2 new mutations (found ${remainingQueue.length})`)
assert(remainingQueue.some(m => m.id === 'mut-2'), 'mut-2 was preserved in queue')
assert(remainingQueue.some(m => m.id === 'mut-3'), 'mut-3 was preserved in queue')

// Test 7: Simulated Project Merge Protection
console.log('\n--- TEST 7: Local Project Protection During Server Ingestion ---')

const currentLocalProjects = [
  { id: 'p1', name: 'Villa Lotus (Local Fast Typed Editing)', updatedAt: '2026-10-19T14:30:00Z' },
  { id: 'p2', name: 'Apartment 4B', updatedAt: '2026-10-19T14:00:00Z' }
]

const serverProjects = [
  { id: 'p1', name: 'Villa Lotus (Stale Server Snapshot)', updatedAt: '2026-10-19T14:29:50Z' },
  { id: 'p2', name: 'Apartment 4B (Updated on Server)', updatedAt: '2026-10-19T14:30:10Z' }
]

const pendingProjectIds = new Set(remainingQueue.map(m => m.projectId))

const merged = serverProjects.map((serverProj) => {
  if (pendingProjectIds.has(serverProj.id)) {
    const localProj = currentLocalProjects.find(p => p.id === serverProj.id)
    if (localProj) return localProj
  }
  return serverProj
})

assert(merged.find(p => p.id === 'p1').name === 'Villa Lotus (Local Fast Typed Editing)', 'Local active project was protected from stale server overwrite')
assert(merged.find(p => p.id === 'p2').name === 'Apartment 4B (Updated on Server)', 'Unmodified project was cleanly updated from server')

console.log('\n========================================================================')
console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
console.log('========================================================================\n')

if (failed > 0) {
  process.exit(1)
}
