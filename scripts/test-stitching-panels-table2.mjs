import fs from 'fs'
import assert from 'assert'

const fullCode = fs.readFileSync('manager-app/src/main.jsx', 'utf8')
const lines = fullCode.split('\n')
const startIdx = lines.findIndex((l) => l.startsWith('const AREAS'))
const endIdx = lines.findIndex((l) => l.startsWith('const SESSION_KEY'))
const secStartIdx = lines.findIndex((l) => l.startsWith('function isHardwareLine('))
const secEndIdx = lines.findIndex((l) => l.startsWith('function calculateInstallationBreakdown('))

const targetSection = [
  ...lines.slice(startIdx > 0 ? startIdx : 11, endIdx > 0 ? endIdx : 600),
  ...lines.slice(secStartIdx > 0 ? secStartIdx : 4175, secEndIdx > 0 ? secEndIdx : 4215)
].join('\n')

const setupCode = `
${targetSection}
return {
  MATERIAL_PRODUCTS,
  PRODUCTS,
  isStitchingPanelProduct,
  unitLabel,
  isCurtainProduct,
  findProductDef,
  calculateProduct,
  isAccessoryOrServiceLine,
  isInstallationServiceLine,
  isDeliveryServiceLine
};
`
const getExports = new Function(setupCode)
const {
  MATERIAL_PRODUCTS,
  PRODUCTS,
  isStitchingPanelProduct,
  unitLabel,
  isCurtainProduct,
  findProductDef,
  calculateProduct,
  isAccessoryOrServiceLine,
  isInstallationServiceLine,
  isDeliveryServiceLine
} = getExports()

console.log('🧪 Starting Verification Tests for Stitching Panels & Table 2 Routing...\n')

// 1. Verify American Stitching panel quantity
console.log('--- Test 1: American Stitching Panel Formula ---')
const am1 = calculateProduct(findProductDef('American Stitching'), 144, 100)
assert.strictEqual(am1.quantity, 8, '144" width / 18 = 8 panels')
assert(am1.note.includes('8 panels'), 'Note includes panel count')

const am2 = calculateProduct(findProductDef('American Stitching'), 60, 84)
assert.strictEqual(am2.quantity, 4, '60" width / 18 = 3.33 -> 4 panels')

const am3 = calculateProduct(findProductDef('American Stitching'), 36, 0)
assert.strictEqual(am3.quantity, 2, '36" width / 18 = 2 panels (even without height)')
assert.strictEqual(unitLabel('American Stitching'), 'panels', 'unitLabel is panels')
console.log('✅ PASS: American Stitching correctly calculates number of panels')

// 2. Verify Valence Stitching panel quantity
console.log('--- Test 2: Valence Stitching Panel Formula ---')
const valDef = findProductDef('Valence Stitching')
assert.strictEqual(valDef.formula, 'stitching-valance')
const vs1 = calculateProduct(valDef, 100, 100)
assert.strictEqual(vs1.quantity, 3, '((100+14)/50) = 2.28 -> 3 panels')
assert(vs1.note.includes('3 panels'), 'Note includes panel count')

const vs2 = calculateProduct(valDef, 50, 0)
assert.strictEqual(vs2.quantity, 2, '((50+14)/50) = 1.28 -> 2 panels')

const vs3 = calculateProduct(valDef, 36, 0)
assert.strictEqual(vs3.quantity, 1, '((36+14)/50) = 1 panel')
assert.strictEqual(unitLabel('Valence Stitching'), 'panels', 'unitLabel is panels')
assert.strictEqual(unitLabel('Velance stitching'), 'panels', 'alias unitLabel is panels')
console.log('✅ PASS: Valence Stitching correctly calculates number of panels')

// 3. Verify Eyelet Stitching panel quantity
console.log('--- Test 3: Eyelet Stitching Panel Formula ---')
const eyeDef = findProductDef('Eyelet Stitching')
assert.strictEqual(eyeDef.formula, 'stitching-eyelet')
const es1 = calculateProduct(eyeDef, 144, 108)
assert.strictEqual(es1.quantity, 8, '144" width / 20 = 7.2 -> 8 panels')
assert(es1.note.includes('8 panels'), 'Note includes panel count')

const es2 = calculateProduct(eyeDef, 60, 84)
assert.strictEqual(es2.quantity, 3, '60" width / 20 = 3 panels')

const es3 = calculateProduct(findProductDef('Eyelet stitching'), 100, 0)
assert.strictEqual(es3.quantity, 5, '100" width / 20 = 5 panels')
assert.strictEqual(unitLabel('Eyelet Stitching'), 'panels', 'unitLabel is panels')
console.log('✅ PASS: Eyelet Stitching correctly calculates number of panels')

// 4. Verify Ripple Stitching panel quantity
console.log('--- Test 4: Ripple Stitching Panel Formula ---')
const ripDef = findProductDef('Ripple Stitching')
assert.strictEqual(ripDef.formula, 'stitching-ripple')
const rs1 = calculateProduct(ripDef, 144, 108)
assert.strictEqual(rs1.quantity, 8, '144" width / 20 = 7.2 -> 8 panels')
assert(rs1.note.includes('8 panels'), 'Note includes panel count')

const rs2 = calculateProduct(ripDef, 60, 84)
assert.strictEqual(rs2.quantity, 3, '60" width / 20 = 3 panels')

const rs3 = calculateProduct(findProductDef('Ripple stitching'), 100, 0)
assert.strictEqual(rs3.quantity, 5, '100" width / 20 = 5 panels')
assert.strictEqual(unitLabel('Ripple Stitching'), 'panels', 'unitLabel is panels')
console.log('✅ PASS: Ripple Stitching correctly calculates number of panels')

// 5. Verify Table Separation in Quotation and Invoice
console.log('--- Test 5: Second Table (Accessory) Placement ---')
const testProducts = [
  'American Stitching',
  'Valence Stitching',
  'Velance stitching',
  'Eyelet Stitching',
  'Eyelet stitching',
  'Ripple Stitching',
  'Ripple stitching'
]

for (const p of testProducts) {
  const line = { product: p, quantity: 4, unitPrice: 200, gst: 18, area: 'Living room' }
  const isSec = isAccessoryOrServiceLine(line)
  const isInst = isInstallationServiceLine(line)
  const isDel = isDeliveryServiceLine(line)

  assert.strictEqual(isSec, true, `${p} must be recognized as accessory/service item`)
  assert.strictEqual(isInst, false, `${p} must not be installation service`)
  assert.strictEqual(isDel, false, `${p} must not be delivery service`)

  // DocumentSheet Table 1 filter (productItems)
  const inTable1 = !isSec && !isInst && !isDel
  assert.strictEqual(inTable1, false, `${p} must NOT be in Table 1 (Main Products Table)`)

  // DocumentSheet Table 2 filter (accessoryItems)
  const inTable2 = isSec && !isInst && !isDel
  assert.strictEqual(inTable2, true, `${p} must BE in Table 2 (Secondary Table: Tracks, Runners, Hooks, Clamps, Stitching)`)
}
console.log('✅ PASS: All 4 stitching products (and aliases) route directly to Table 2 (Secondary Table) in Quotation and Invoice')

// 6. Verify isCurtainProduct does not confuse stitching with physical curtain tracks
console.log('--- Test 6: isCurtainProduct excludes stitching ---')
assert.strictEqual(isCurtainProduct('American Stitching'), false)
assert.strictEqual(isCurtainProduct('Valence Stitching'), false)
assert.strictEqual(isCurtainProduct('Eyelet Stitching'), false)
assert.strictEqual(isCurtainProduct('Ripple Stitching'), false)
assert.strictEqual(isCurtainProduct('American Main curtains'), true)
assert.strictEqual(isCurtainProduct('Eyelet main curtain'), true)
console.log('✅ PASS: isCurtainProduct correctly excludes stitching products')

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!')
