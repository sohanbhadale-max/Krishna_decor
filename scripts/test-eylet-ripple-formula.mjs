import fs from 'fs'
import assert from 'assert'

const fullCode = fs.readFileSync('manager-app/src/main.jsx', 'utf8')
const lines = fullCode.split('\n')
const targetSection = lines.slice(11, 337).join('\n')

const setupCode = `
${targetSection}
return { calculateProduct, findProductDef, staffSubmissionLine, unitLabel };
`
const getExports = new Function(setupCode)
const { calculateProduct, findProductDef, staffSubmissionLine, unitLabel } = getExports()

console.log('Testing Eyelet and Ripple formula calculations...')

// Test 1: Eylet 144x108
// Total Quantity = ceil(144/20) * ((108 + 15) / 39) = 8 * (123 / 39) = 25.23 m
const res1 = calculateProduct({ name: 'Eylet curtains', formula: 'eyelet' }, 144, 108)
console.log('Test 1 (Eylet 144x108):', res1)
assert.strictEqual(res1.quantity, 25.23)
assert(res1.note.includes('8 panels'))
assert(res1.note.includes('25.23 m'))

// Test 2: Ripple 60x84
// Total Quantity = ceil(60/20) * ((84 + 15) / 39) = 3 * (99 / 39) = 7.62 m
const res2 = calculateProduct({ name: 'Ripple main curtain', formula: 'ripple' }, 60, 84)
console.log('Test 2 (Ripple 60x84):', res2)
assert.strictEqual(res2.quantity, 7.62)
assert(res2.note.includes('3 panels'))
assert(res2.note.includes('7.62 m'))

// Test 3: Eylet lining 100x100
// Total Quantity = ceil(100/20) * ((100 + 15) / 39) = 5 * (115 / 39) = 14.74 m
const res3 = calculateProduct({ name: 'Eylet lining' }, 100, 100)
console.log('Test 3 (Eylet lining 100x100):', res3)
assert.strictEqual(res3.quantity, 14.74)
assert(res3.note.includes('5 panels'))
assert(res3.note.includes('14.74 m'))

// Test 4: Ripple sheer 100x100
const res4 = calculateProduct({ name: 'Ripple sheer' }, 100, 100)
console.log('Test 4 (Ripple sheer 100x100):', res4)
assert.strictEqual(res4.quantity, 14.74)

// Test 5: Standard product (Roller blinds) uses standard area (100*100 / 144 = 69.44)
const res5 = calculateProduct({ name: 'Roller blinds' }, 100, 100)
console.log('Test 5 (Roller blinds 100x100):', res5)
assert.strictEqual(res5.quantity, 69.44)
assert(res5.note.includes('69.44 sq ft'))

// Test 6: findProductDef
assert.strictEqual(findProductDef('Eylet main curtain').formula, 'eyelet')
assert.strictEqual(findProductDef('Eyelet Main curtains').formula, 'eyelet')
assert.strictEqual(findProductDef('Ripple main curtain').formula, 'ripple')
assert.strictEqual(findProductDef('Ripple sheer').formula, 'ripple')
assert.strictEqual(findProductDef('Ripple stitching').formula, 'standard')

// Test 7: unitLabel
assert.strictEqual(unitLabel('Eylet main curtain'), 'm')
assert.strictEqual(unitLabel('Ripple curtains'), 'm')
assert.strictEqual(unitLabel('Track'), 'ft')
assert.strictEqual(unitLabel('Runners'), 'pcs')
assert.strictEqual(unitLabel('Roller blinds'), 'sq ft')

// Test 8: staffSubmissionLine with old quantity should recompute for formula products
const staffSub = {
  id: 'sub-1',
  product: 'Eylet main curtain',
  width: 144,
  height: 108,
  unit: 'in',
  quantity: 108.00 // old general formula or wrong quantity
}
const line = staffSubmissionLine(staffSub)
console.log('Test 8 (Staff submission line):', line)
assert.strictEqual(line.quantity, 25.23)
assert(line.note.includes('25.23 m'))

console.log('\n--- ALL 8 TESTS PASSED SUCCESSFULLY! ---')
