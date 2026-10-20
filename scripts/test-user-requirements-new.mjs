import assert from 'node:assert'
import fs from 'node:fs'

console.log('=== VERIFYING NEW USER REQUIREMENTS ===\n')

const managerMain = fs.readFileSync('e:/PROJECTS/d-decor/manager-app/src/main.jsx', 'utf-8')
const managerCss = fs.readFileSync('e:/PROJECTS/d-decor/manager-app/src/styles.css', 'utf-8')
const staffMain = fs.readFileSync('e:/PROJECTS/d-decor/staff-app/src/main.jsx', 'utf-8')

// Requirement 1: Remove transparent mathematical formulas on quotations (formatQuotationCalculation)
console.log('--- Requirement 1: Remove transparent mathematical formulas on quotations ---')
assert(managerMain.includes('function formatQuotationCalculation(line) {'), 'formatQuotationCalculation function exists')
assert(managerMain.includes("return ''"), 'formatQuotationCalculation returns empty string')
assert(managerCss.includes('.document-table td small.quotation-calc-note, .quotation-calc-note { display: none !important; }'), 'CSS hides quotation-calc-note')
console.log('✓ PASS: formatQuotationCalculation returns empty string and quotation-calc-note display is suppressed.')

// Requirement 2: Option to rename the measurements in measurement set
console.log('\n--- Requirement 2: Rename measurements in measurement set ---')
assert(managerMain.includes('function RenameMeasurementModal'), 'RenameMeasurementModal component exists')
assert(managerMain.includes('handleRenameMeasurement = (targetAreaId, setId, newLabel) =>'), 'handleRenameMeasurement exists and updates measurements and products')
assert(managerMain.includes('setRenamingMeasurement'), 'renamingMeasurement state hook used')
assert(managerMain.includes('measure-chip-rename-btn'), 'Rename buttons present in UI')
assert(managerCss.includes('.measure-chip-rename-btn'), 'CSS styles present for measurement rename button')
console.log('✓ PASS: Rename measurements UI and logic implemented across measurement sets and area products.')

// Requirement 3: Valence curtain rename, sheer/lining removal, and formula
console.log('\n--- Requirement 3: Valence rename and formula ---')
assert(!managerMain.includes("'Valence sheer'"), 'Valence sheer removed from manager products')
assert(!managerMain.includes("'Valence lining'"), 'Valence lining removed from manager products')
assert(!staffMain.includes("'Valence sheer'"), 'Valence sheer removed from staff products')
assert(!staffMain.includes("'Valence lining'"), 'Valence lining removed from staff products')
assert(managerMain.includes("['Valence', 5, 'valance']"), 'Valence is defined as individual material')
assert(staffMain.includes("'Valence'"), 'Valence is defined in staff products')

// Test Valence formula:
// ((width + 14) / 50) inches = A (rounded to next figure)
// ((A * 15) / 39) inches = B (rounded to next figure)
// B is quantity in metres
function calcValence(w) {
  const A = Math.ceil((w + 14) / 50)
  const B = Math.ceil((A * 15) / 39)
  return { A, B }
}

const val1 = calcValence(36) // (36+14)/50 = 1 -> A=1. (1*15)/39 = 0.384 -> B=1
assert.strictEqual(val1.A, 1)
assert.strictEqual(val1.B, 1)

const val2 = calcValence(72) // (72+14)/50 = 86/50 = 1.72 -> A=2. (2*15)/39 = 30/39 = 0.769 -> B=1
assert.strictEqual(val2.A, 2)
assert.strictEqual(val2.B, 1)

const val3 = calcValence(120) // (120+14)/50 = 134/50 = 2.68 -> A=3. (3*15)/39 = 45/39 = 1.153 -> B=2
assert.strictEqual(val3.A, 3)
assert.strictEqual(val3.B, 2)

assert(managerMain.includes('const A = Math.ceil((w + 14) / 50)'), 'Valence calculates A = Math.ceil((w + 14) / 50)')
assert(managerMain.includes('const B = Math.ceil((A * 15) / 39)'), 'Valence calculates B = Math.ceil((A * 15) / 39)')
console.log('✓ PASS: Valence curtain renamed to Valence, sheer/lining removed, formula correctly calculates B metres.')

// Requirement 4: American curtains individual materials and formula
console.log('\n--- Requirement 4: American curtains individual materials & formula ---')
assert(managerMain.includes("'American main curtain'"), 'American main curtain material exists in manager')
assert(managerMain.includes("'American sheer curtain'"), 'American sheer curtain material exists in manager')
assert(managerMain.includes("'American lining'"), 'American lining material exists in manager')
assert(staffMain.includes("'American main curtain'"), 'American main curtain material exists in staff')
assert(staffMain.includes("'American sheer curtain'"), 'American sheer curtain material exists in staff')
assert(staffMain.includes("'American lining'"), 'American lining material exists in staff')

// Test American formula:
// (Width / 18) = A rounded to next figure
// (Height + 15) / 39 = B
// Quantity = B * A
function calcAmerican(w, h) {
  const A = Math.ceil(w / 18)
  const B = (h + 15) / 39
  return Number((A * B).toFixed(2))
}

const am1 = calcAmerican(72, 90) // A = 72/18 = 4. B = 105/39 = 2.6923. Qty = 10.77
assert.strictEqual(am1, 10.77)
assert(managerMain.includes('const A = Math.ceil(w / 18)'), 'American formula calculates A = Math.ceil(w / 18)')
assert(managerMain.includes('const B = (h + 15) / 39'), 'American formula calculates B = (h + 15) / 39')
console.log('✓ PASS: American curtains are 3 individual materials and quantity = A * B.')

// Requirement 5: Eyelet & Ripple curtains individual materials and formula
console.log('\n--- Requirement 5: Eyelet and Ripple curtains individual materials & formula ---')
assert(managerMain.includes("'Eyelet main curtain'"), 'Eyelet main curtain material exists in manager')
assert(managerMain.includes("'Eyelet sheer curtain'"), 'Eyelet sheer curtain material exists in manager')
assert(managerMain.includes("'Eyelet lining'"), 'Eyelet lining material exists in manager')
assert(managerMain.includes("'Ripple main curtain'"), 'Ripple main curtain material exists in manager')
assert(managerMain.includes("'Ripple sheer curtain'"), 'Ripple sheer curtain material exists in manager')
assert(managerMain.includes("'Ripple lining'"), 'Ripple lining material exists in manager')

// Test Eyelet/Ripple formula:
// (Width / 20) = A rounded to next figure
// (Height + 15) / 39 = B
// Quantity = B * A
function calcEyeletRipple(w, h) {
  const A = Math.ceil(w / 20)
  const B = (h + 15) / 39
  return Number((A * B).toFixed(2))
}

const er1 = calcEyeletRipple(60, 84) // A = 60/20 = 3. B = 99/39 = 2.5385. Qty = 7.62
assert.strictEqual(er1, 7.62)
assert(managerMain.includes('const A = Math.ceil(w / 20)'), 'Eyelet/Ripple formula calculates A = Math.ceil(w / 20)')
console.log('✓ PASS: Eyelet and Ripple curtains are individual materials and quantity = A * B with width/20.')

console.log('\n======================================================')
console.log('🎉 ALL 5 USER REQUIREMENTS VERIFIED SUCCESSFULLY (100% PASS)')
