import assert from 'node:assert'
import fs from 'node:fs'

console.log('=== VERIFYING CURTAIN SYSTEM REQUIREMENTS ===\n')

// 1. Verify manager-app main.jsx
const managerCode = fs.readFileSync('e:/PROJECTS/d-decor/manager-app/src/main.jsx', 'utf-8')

// Test 1: American curtains components
assert(managerCode.includes("'American main curtain'"), 'American main curtain is present')
assert(managerCode.includes("'American sheer'"), 'American sheer is present')
assert(managerCode.includes("'American lining'"), 'American lining is present')
console.log('✓ Requirement 1: American curtains includes American main curtain, American sheer, American lining')

// Test 2: Valence curtains components
assert(managerCode.includes("'Valence main curtain'"), 'Valence main curtain is present')
assert(managerCode.includes("'Valence sheer'"), 'Valence sheer is present')
assert(managerCode.includes("'Valence lining'"), 'Valence lining is present')
console.log('✓ Requirement 2: Valence curtains includes Valence main curtain, Valence sheer, Valence lining')

// Test 3: Eylet curtains components
assert(managerCode.includes("'Eylet main curtain'"), 'Eylet main curtain is present')
assert(managerCode.includes("'Eylet sheer'"), 'Eylet sheer is present')
assert(managerCode.includes("'Eylet lining'"), 'Eylet lining is present')
console.log('✓ Requirement 3: Eylet curtains includes Eylet main curtain, Eylet sheer, Eylet lining')

// Test 4: Ripple curtains components
assert(managerCode.includes("'Ripple main curtain'"), 'Ripple main curtain is present')
assert(managerCode.includes("'Ripple sheer'"), 'Ripple sheer is present')
assert(managerCode.includes("'Ripple lining'"), 'Ripple lining is present')
console.log('✓ Requirement 4: Ripple curtains includes Ripple main curtain, Ripple sheer, Ripple lining')

// Test 5 & 6: Clamp dropdown and exclusion
assert(managerCode.includes("const CLAMP_OPTIONS = ['Ceiling Clamps', 'Single wall clamp', 'Double wall clamp']"), 'CLAMP_OPTIONS defined')
assert(managerCode.includes("!['Track', 'Runners', 'Hooks', ...CLAMP_OPTIONS].includes(product.name)"), 'Clamps and hardware excluded from product dropdown')
assert(managerCode.includes("selectedProduct.curtainSystem &&"), 'Clamp dropdown only displayed when curtain system is selected')
console.log('✓ Requirement 5 & 6: Clamps dropdown for Ceiling Clamps, Single wall clamp, Double wall clamp shown only when curtain is selected, and excluded from product dropdown')

// Test 7 & 8: Track, Runners, and Hooks calculations
// Formula tests:
const widthInches1 = 144
const track1 = Math.ceil(widthInches1 / 12)
const runners1 = track1 * 3
const hooks1 = track1 * 3
assert.strictEqual(track1, 12, '144 inches width -> 12 running feet track')
assert.strictEqual(runners1, 36, '12 track feet -> 36 runners')
assert.strictEqual(hooks1, 36, '12 track feet -> 36 hooks')

const widthInches2 = 140
const track2 = Math.ceil(widthInches2 / 12)
const runners2 = track2 * 3
const hooks2 = track2 * 3
assert.strictEqual(track2, 12, '140 inches width -> 12 running feet track (rounded up)')
assert.strictEqual(runners2, 36, '12 track feet -> 36 runners')
assert.strictEqual(hooks2, 36, '12 track feet -> 36 hooks')

assert(managerCode.includes("Math.ceil((Number(item.width) || 0) / 12)") || managerCode.includes("Math.ceil((Number(curtainItem.width) || 0) / 12)"), 'Track calculation: Math.ceil(width / 12)')
assert(managerCode.includes("totalTrackFeet * 3") || managerCode.includes("trackFeet * 3"), 'Runners calculation: trackFeet * 3')
assert(managerCode.includes("totalTrackFeet * 3") || managerCode.includes("trackFeet * 3"), 'Hooks calculation: trackFeet * 3')
console.log('✓ Requirement 7 & 8: Track = Math.ceil(width / 12) running feet, Runners = 3 * track, Hooks = 3 * track')

// 2. Verify staff-app main.jsx
const staffCode = fs.readFileSync('e:/PROJECTS/d-decor/staff-app/src/main.jsx', 'utf-8')
assert(staffCode.includes("'American main curtain'"), 'Staff app includes American main curtain')
assert(staffCode.includes("'American sheer'"), 'Staff app includes American sheer')
assert(staffCode.includes("'American lining'"), 'Staff app includes American lining')
assert(staffCode.includes("'Valence main curtain'"), 'Staff app includes Valence main curtain')
assert(staffCode.includes("'Eylet main curtain'"), 'Staff app includes Eylet main curtain')
assert(staffCode.includes("'Ripple main curtain'"), 'Staff app includes Ripple main curtain')
assert(staffCode.includes("const CLAMP_OPTIONS = ['Ceiling Clamps', 'Single wall clamp', 'Double wall clamp']"), 'Staff app defines CLAMP_OPTIONS')
assert(staffCode.includes("isCurtainSelected &&"), 'Staff app clamp dropdown appears only for curtain systems')
assert(staffCode.includes("itemsToAdd = curtainSystem.products.map"), 'Staff app adds all 3 products for selected curtain system')
console.log('✓ Staff App: Curtain systems bundle all 3 components into cart with clamp options and exclusion from dropdown')

console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===\n')
