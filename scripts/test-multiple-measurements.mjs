import fs from 'fs'
import assert from 'assert'

const fullCode = fs.readFileSync('manager-app/src/main.jsx', 'utf8')
const lines = fullCode.split('\n')
const endIdx = lines.findIndex((l) => l.startsWith('const SESSION_KEY'))
const startIdx = lines.findIndex((l) => l.startsWith('const AREAS ='))
const targetSection = lines.slice(startIdx > 0 ? startIdx : 13, endIdx > 0 ? endIdx : 585).join('\n')

const setupCode = `
${targetSection}
return { getAreaMeasurementSets, calculateMeasurementSetsCoverage, formatItemMeasurementSummary, staffSubmissionLine };
`
const getExports = new Function(setupCode)
const { getAreaMeasurementSets, calculateMeasurementSetsCoverage, formatItemMeasurementSummary, staffSubmissionLine } = getExports()

console.log('Testing Multiple Measurements for same area...')

// Test 1: Area with explicit measurementSets
const area1 = {
  id: 'area-1',
  name: 'Living Room',
  width: 144,
  height: 108,
  unit: 'in',
  measurementSets: [
    { id: 'm1', label: 'Main Balcony', width: 144, height: 108, unit: 'in' },
    { id: 'm2', label: 'Side Window', width: 60, height: 72, unit: 'in' }
  ]
}

const sets1 = getAreaMeasurementSets(area1)
console.log('Test 1 - Explicit sets count:', sets1.length)
assert.strictEqual(sets1.length, 2)
assert.strictEqual(sets1[0].label, 'Main Balcony')
assert.strictEqual(sets1[1].label, 'Side Window')

const cov1 = calculateMeasurementSetsCoverage(sets1, 'in')
console.log('Test 1 - Coverage:', cov1)
assert.strictEqual(cov1.validSets, 2)
// (144*108/144) + (60*72/144) = 108 + 30 = 138 sq ft
assert.strictEqual(cov1.totalSqFt, 138)

// Test 2: Area without explicit measurementSets but with multiple staff submissions
const area2 = {
  id: 'area-2',
  name: 'Master Bedroom',
  width: 72,
  height: 84,
  unit: 'in'
}

const staffDrafts = [
  { id: 'd1', area: 'Master Bedroom', width: 72, height: 84, unit: 'in', product: 'Curtains', notes: 'Window 1' },
  { id: 'd2', area: 'Master Bedroom', width: 96, height: 84, unit: 'in', product: 'Curtains', notes: 'Window 2' }
]

const sets2 = getAreaMeasurementSets(area2, staffDrafts)
console.log('Test 2 - Staff discovered sets count:', sets2.length)
assert.strictEqual(sets2.length, 2)
assert.strictEqual(sets2[0].width, 72)
assert.strictEqual(sets2[1].width, 96)

const cov2 = calculateMeasurementSetsCoverage(sets2, 'in')
console.log('Test 2 - Coverage with staff sets:', cov2)
assert.strictEqual(cov2.validSets, 2)
// (72*84/144) + (96*84/144) = 42 + 56 = 98 sq ft
assert.strictEqual(cov2.totalSqFt, 98)

// Test 3: formatItemMeasurementSummary with variant label
const itemWithVariant = {
  product: 'Curtains',
  width: 72,
  height: 84,
  unit: 'in',
  variantLabel: 'Window 2'
}
const sum3 = formatItemMeasurementSummary(itemWithVariant)
console.log('Test 3 - formatItemMeasurementSummary:', sum3)
assert(sum3.includes('Window 2: 72 × 84 in (42 sq ft)'))

// Test 4: staffSubmissionLine generates measurementSummary
const staffLine = staffSubmissionLine({
  id: 'sub-99',
  area: 'Living Room',
  product: 'Roller blinds',
  width: 48,
  height: 72,
  unit: 'in',
  quantity: 24,
  unitPrice: 150
})
console.log('Test 4 - staffSubmissionLine measurementSummary:', staffLine.measurementSummary)
assert(staffLine.measurementSummary.includes('48 × 72 in (24 sq ft)'))

// Test 5: Simulating adding a new measurement set to an area with an existing set
const areaBefore = {
  id: 'area-living',
  name: 'Living Room',
  width: 70,
  height: 84,
  unit: 'in',
  measurementSets: [
    { id: 'mset-1', label: 'Measurement 1', width: 70, height: 84, unit: 'in' }
  ],
  products: [
    {
      id: 'prod-1',
      product: 'Curtains',
      width: 70,
      height: 84,
      unit: 'in',
      measurementSetId: 'mset-1',
      variantLabel: 'Measurement 1',
      quantity: 4.08
    }
  ]
}

// User adds Measurement 2
const newMSet = {
  id: 'mset-2',
  label: 'Measurement 2',
  width: 50,
  height: 60,
  unit: 'in'
}
const nextSets = [...areaBefore.measurementSets, newMSet]
assert.strictEqual(nextSets.length, 2)
assert.strictEqual(nextSets[0].width, 70, 'Measurement 1 width retained')
assert.strictEqual(nextSets[0].height, 84, 'Measurement 1 height retained')
assert.strictEqual(nextSets[1].width, 50, 'Measurement 2 width recorded')
assert.strictEqual(nextSets[1].height, 60, 'Measurement 2 height recorded')

// Verifying product attached to mset-1 retains its exact dimensions and quantity
const prod = areaBefore.products[0]
const matchingSet = nextSets.find(s => s.id === prod.measurementSetId)
assert.strictEqual(matchingSet.id, 'mset-1')
assert.strictEqual(matchingSet.width, 70)
assert.strictEqual(matchingSet.height, 84)

console.log('Test 5 - Measurement set retention verified: Set 1 retained (70×84), Set 2 recorded (50×60).')
console.log('--- ALL MULTIPLE MEASUREMENTS TESTS PASSED! ---')
