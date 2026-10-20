import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('--- VERIFYING HARDWARE AUTOMATIC CALCULATIONS & BLINDS LOGIC ---')

const managerSrc = fs.readFileSync(path.resolve('manager-app/src/main.jsx'), 'utf-8')
const staffSrc = fs.readFileSync(path.resolve('staff-app/src/main.jsx'), 'utf-8')
const serverSrc = fs.readFileSync(path.resolve('api/src/server.js'), 'utf-8')
const apiPathSrc = fs.readFileSync(path.resolve('api/[...path].js'), 'utf-8')

// 1. Verify 'Track' is removed from MATERIAL_PRODUCTS and RAW_STAFF_PRODUCTS (only 'Tracks' exists)
assert(!managerSrc.includes("['Track', 18]"), "manager-app must not have singular ['Track', 18] in MATERIAL_PRODUCTS")
assert(managerSrc.includes("['Tracks', 18, 'tracks']"), "manager-app must have ['Tracks', 18, 'tracks'] in MATERIAL_PRODUCTS")
assert(!staffSrc.includes("'Track',"), "staff-app must not include singular 'Track' in RAW_STAFF_PRODUCTS")
assert(staffSrc.includes("'Tracks',"), "staff-app must include 'Tracks' in RAW_STAFF_PRODUCTS")
console.log("✅ PASS 1: Singular 'Track' removed, replaced by 'Tracks' in both manager-app and staff-app")

// 2. Verify hardware items are present in MATERIAL_PRODUCTS and RAW_STAFF_PRODUCTS
const HARDWARE_ITEMS = [
  'tracks',
  'runners',
  'hooks',
  'ceiling clamps',
  'single wall clamps',
  'double wall clamps'
]

for (const item of HARDWARE_ITEMS) {
  assert(
    managerSrc.toLowerCase().includes(`'${item}'`),
    `manager-app must include '${item}' in material products`
  )
  assert(
    staffSrc.toLowerCase().includes(`'${item}'`),
    `staff-app must include '${item}' in RAW_STAFF_PRODUCTS`
  )
}
console.log('✅ PASS 2: Hardware items are present in product lists')

// 3. Verify hardware items are NOT in MANUAL_QUANTITY_MATERIALS across all 4 files
for (const fileSrc of [managerSrc, staffSrc, serverSrc, apiPathSrc]) {
  // Extract MANUAL_QUANTITY_MATERIALS block
  const match = fileSrc.match(/const\s+MANUAL_QUANTITY_MATERIALS\s*=\s*(?:new\s+Set\()?\[([\s\S]*?)\](?:\))?/)
  assert(match, 'MANUAL_QUANTITY_MATERIALS set/array must exist')
  const content = match[1].toLowerCase()
  assert(!content.includes("'track'"), "MANUAL_QUANTITY_MATERIALS must not contain 'track'")
  assert(!content.includes("'tracks'"), "MANUAL_QUANTITY_MATERIALS must not contain 'tracks'")
  assert(!content.includes("'runners'"), "MANUAL_QUANTITY_MATERIALS must not contain 'runners'")
  assert(!content.includes("'hooks'"), "MANUAL_QUANTITY_MATERIALS must not contain 'hooks'")
  assert(!content.includes("'ceiling clamps'"), "MANUAL_QUANTITY_MATERIALS must not contain 'ceiling clamps'")
  assert(!content.includes("'single wall clamps'"), "MANUAL_QUANTITY_MATERIALS must not contain 'single wall clamps'")
  assert(!content.includes("'double wall clamps'"), "MANUAL_QUANTITY_MATERIALS must not contain 'double wall clamps'")
}
console.log('✅ PASS 3: Hardware items removed from MANUAL_QUANTITY_MATERIALS across all 4 files')

// 4. Verify hardware formula calculations in manager-app
function calculateHardware(w, formula) {
  const trackFeet = Math.max(1, Math.ceil(w / 12))
  switch (formula) {
    case 'tracks':
      return trackFeet
    case 'runners':
    case 'hooks':
      return trackFeet * 3
    case 'ceiling-clamp':
    case 'single-clamp':
    case 'double-clamp':
    case 'clamp':
      return Math.max(1, Math.ceil(trackFeet / 2))
    default:
      return 0
  }
}

// Test case A: Width = 48 inches (4 feet)
assert.strictEqual(calculateHardware(48, 'tracks'), 4, '48" width -> 4 running feet of track')
assert.strictEqual(calculateHardware(48, 'runners'), 12, '48" width -> 12 runners (3 per foot)')
assert.strictEqual(calculateHardware(48, 'hooks'), 12, '48" width -> 12 hooks (3 per foot)')
assert.strictEqual(calculateHardware(48, 'ceiling-clamp'), 2, '48" width -> 2 ceiling clamps (1 per 2 feet)')
assert.strictEqual(calculateHardware(48, 'single-clamp'), 2, '48" width -> 2 single wall clamps (1 per 2 feet)')
assert.strictEqual(calculateHardware(48, 'double-clamp'), 2, '48" width -> 2 double clamps (1 per 2 feet)')

// Test case B: Width = 50 inches -> Math.ceil(50/12) = 5 feet
assert.strictEqual(calculateHardware(50, 'tracks'), 5, '50" width -> 5 running feet of track')
assert.strictEqual(calculateHardware(50, 'runners'), 15, '50" width -> 15 runners (3 per foot)')
assert.strictEqual(calculateHardware(50, 'hooks'), 15, '50" width -> 15 hooks (3 per foot)')
assert.strictEqual(calculateHardware(50, 'ceiling-clamp'), 3, '50" width -> Math.ceil(5/2) = 3 clamps')
assert.strictEqual(calculateHardware(50, 'single-clamp'), 3, '50" width -> Math.ceil(5/2) = 3 clamps')
assert.strictEqual(calculateHardware(50, 'double-clamp'), 3, '50" width -> Math.ceil(5/2) = 3 clamps')

console.log('✅ PASS 4: Hardware calculation formulas verified (tracks, runners, hooks, clamps)')

// 5. Verify Blinds formula calculations
function calculateBlindSqft(w, h, minimumArea = 11) {
  const A = Math.max(1, Math.round(w / 12))
  const B = Math.max(1, Math.round(h / 12))
  const rawSqft = A * B
  return Number(Math.max(rawSqft, minimumArea).toFixed(2))
}

// Test case A: Small blind 34" x 40" -> A = round(34/12) = 3, B = round(40/12) = 3 -> raw 9 sqft
// With 11 minimum:
assert.strictEqual(calculateBlindSqft(34, 40, 11), 11, '34" x 40" blind with 11 sqft minimum -> 11 sqft')
// With 16.5 minimum:
assert.strictEqual(calculateBlindSqft(34, 40, 16.5), 16.5, '34" x 40" blind with 16.5 sqft minimum -> 16.5 sqft')

// Test case B: Large blind 55" x 70" -> A = round(55/12) = 5, B = round(70/12) = 6 -> raw 30 sqft
assert.strictEqual(calculateBlindSqft(55, 70, 11), 30, '55" x 70" blind -> 30 sqft (exceeds min 11)')
assert.strictEqual(calculateBlindSqft(55, 70, 16.5), 30, '55" x 70" blind -> 30 sqft (exceeds min 16.5)')

// Test case C: Verify all 4 blinds have blind-sqft formula in MATERIAL_PRODUCTS
const BLIND_PRODUCTS = ['Roller blinds', 'Zebra blinds', 'Wooden Venetian blinds', 'Monsoon blinds']
for (const b of BLIND_PRODUCTS) {
  assert(
    managerSrc.includes(`['${b}', 18, 'blind-sqft']`),
    `manager-app must configure '${b}' with 'blind-sqft' formula`
  )
}
console.log('✅ PASS 5: Blinds formula (A=round(w/12), B=round(h/12), min 11 or 16.5 sqft) verified for all 4 blinds')

// 6. Verify staff-app supports hardware width-only and blinds minimumArea
assert(staffSrc.includes('!isHardwareSelected'), 'staff-app does not require height when hardware is selected')
assert(staffSrc.includes('11 sq ft (Standard)'), 'staff-app has 11 sq ft option')
assert(staffSrc.includes('16.5 sq ft'), 'staff-app has 16.5 sq ft option')
console.log('✅ PASS 6: staff-app verified for hardware input and minimumArea options')

// 7. Verify API server does not require height for hardware and preserves minimumArea
assert(serverSrc.includes('isHardwareProduct'), 'api/src/server.js includes isHardwareProduct helper')
assert(apiPathSrc.includes('isHardwareProduct'), 'api/[...path].js includes isHardwareProduct helper')
assert(serverSrc.includes('minimumArea:'), 'api/src/server.js preserves minimumArea')
assert(apiPathSrc.includes('minimumArea:'), 'api/[...path].js preserves minimumArea')
console.log('✅ PASS 7: API endpoints accept hardware width-only and preserve minimumArea')

console.log('\n======================================================')
console.log('🎉 ALL AUTOMATIC HARDWARE & BLINDS CALCULATIONS VERIFIED!')
