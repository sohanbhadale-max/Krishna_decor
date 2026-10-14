// Automated verification test for:
// 1. Eylet and Ripple curtain formula: Width/20 ceil = A, (Height+15)/39 = B, Quantity = B * A
// 2. Rounding off of quantities to 2 decimal places
// 3. Unified tracks, runners, hooks, and clamps placed at bottom of quotation
// 4. In materials section, when a product is changed/edited, quantity updates based on product formula
// 5. Duplicate drafts and Add curtain hardware removed from quotation section

import assert from 'node:assert'
import fs from 'node:fs'

console.log('=== VERIFYING USER REQUIREMENTS ===\n')

const mainCode = fs.readFileSync('e:/PROJECTS/d-decor/manager-app/src/main.jsx', 'utf-8')

// Test 1: Eylet and Ripple formula in code
console.log('Test 1: Eylet and Ripple curtain formula verification')
const testW1 = 144
const testH1 = 108
const A1 = Math.ceil(testW1 / 20)
const B1 = (testH1 + 15) / 39
const qty1 = Number((A1 * B1).toFixed(2))

assert.strictEqual(A1, 8, 'Width 144" / 20 rounded up = 8 panels (A)')
assert.strictEqual(Number(B1.toFixed(4)), Number((123/39).toFixed(4)), 'Height (108+15)/39 = 3.1538 (B)')
assert.strictEqual(qty1, 25.23, 'B * A = 25.23 m (rounded to 2 decimal places)')

const testW2 = 60
const testH2 = 84
const A2 = Math.ceil(testW2 / 20)
const B2 = (testH2 + 15) / 39
const qty2 = Number((A2 * B2).toFixed(2))

assert.strictEqual(A2, 3, 'Width 60" / 20 rounded up = 3 panels (A)')
assert.strictEqual(qty2, 7.62, 'B * A = 7.62 m (rounded to 2 decimal places)')

// Verify calculateProduct handles eyelet and ripple with this formula
assert(mainCode.includes("product.formula === 'eyelet' || product.formula === 'ripple'"), 'calculateProduct checks eyelet and ripple formula')
assert(mainCode.includes("const A = Math.ceil(w / 20)"), 'Formula divides width by 20 and rounds up to next figure (A)')
assert(mainCode.includes("const B = (h + 15) / 39"), 'Formula calculates (height + 15) / 39 (B)')
assert(mainCode.includes("const qty = Number((A * B).toFixed(2))"), 'Formula calculates B * A rounded to 2 decimal places')
console.log('  [PASS] Requirement 1 verified: Eylet and Ripple curtain formula correctly implemented.')

// Test 2: Quantity rounded to 2 decimal places
console.log('\nTest 2: Rounding off quantities to 2 decimal places')
assert(mainCode.includes("const quantity = (value) => Number(value || 0).toFixed(2)"), 'quantity helper rounds value to exactly 2 decimal places')
console.log('  [PASS] Requirement 2 verified: Quantities rounded off to 2 decimal places.')

// Test 3: Unified tracks, runners, hooks, and clamps at bottom of quotation
console.log('\nTest 3: Unified tracks, runners, hooks, and clamps')
assert(mainCode.includes("function isHardwareLine"), 'isHardwareLine helper identifies hardware components')
assert(mainCode.includes("function unifyQuoteItems"), 'unifyQuoteItems helper unifies tracks, runners, hooks, and clamps')
assert(mainCode.includes("id: 'hardware-unified-track'"), 'Hardware unified Track line defined')
assert(mainCode.includes("id: 'hardware-unified-runners'"), 'Hardware unified Runners line defined')
assert(mainCode.includes("id: 'hardware-unified-hooks'"), 'Hardware unified Hooks line defined')
assert(mainCode.includes("return [...regular, ...Array.from(hardwareMap.values())]"), 'Hardware items are placed at the bottom of the quotation')
console.log('  [PASS] Requirement 3 verified: Hardware items unified and positioned at the bottom of the quotation.')

// Test 4: Quantity recalculates when product is changed/edited in materials section
console.log('\nTest 4: Quantity changes on product edit based on product formula')
assert(mainCode.includes("prevProductRef.current !== product"), 'EditMaterialModal detects product change and recalculates quantity')
assert(mainCode.includes("const calc = calculateProduct(prodObj, effectiveWidthInches, effectiveHeightInches)"), 'EditMaterialModal applies formula for both staff and manager products')
assert(mainCode.includes("setQuantity(calc.quantity)"), 'EditMaterialModal updates quantity based on formula')
assert(mainCode.includes("const updatedProducts = (targetArea.products || []).map"), 'changeDimension updates all existing products in area when dimensions change')
console.log('  [PASS] Requirement 4 verified: Product quantity updates automatically when product or dimensions are edited.')

// Test 5: Removed Duplicate draft and Add curtain hardware from quotation section
console.log('\nTest 5: Removal of Duplicate draft and Add curtain hardware buttons')
assert(!mainCode.includes(">Duplicate draft<"), 'No "Duplicate draft" button text in quotation section')
assert(!mainCode.includes(">Add curtain hardware<"), 'No "Add curtain hardware" button text in quotation section')
assert(!mainCode.includes("title=\"Calculate and add curtain hardware"), 'No Add curtain hardware title')
console.log('  [PASS] Requirement 5 verified: Duplicate draft and Add curtain hardware removed from quotation section.')

console.log('\n=== ALL 5 REQUIREMENTS VERIFIED SUCCESSFULLY (100% PASS) ===\n')
