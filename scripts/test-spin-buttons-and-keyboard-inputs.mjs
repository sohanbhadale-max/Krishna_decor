import fs from 'node:fs'
import path from 'node:path'

console.log('\n========================================================================')
console.log('=== TEST SUITE: SPIN BUTTON REMOVAL & DIRECT KEYBOARD INPUT VERIFICATION ===')
console.log('========================================================================\n')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log('  \x1b[32m[PASS]\x1b[0m', message)
    passed++
  } else {
    console.error('  \x1b[31m[FAIL]\x1b[0m', message)
    failed++
  }
}

// 1. Verify CSS in manager-app
console.log('--- SECTION 1: MANAGER APP CSS ---')
const managerCss = fs.readFileSync(path.resolve('manager-app/src/styles.css'), 'utf-8')
assert(managerCss.includes('::-webkit-outer-spin-button'), 'manager-app styles.css targets ::-webkit-outer-spin-button')
assert(managerCss.includes('::-webkit-inner-spin-button'), 'manager-app styles.css targets ::-webkit-inner-spin-button')
assert(managerCss.includes('-webkit-appearance: none !important;'), 'manager-app disables webkit appearance for spin buttons')
assert(managerCss.includes('-moz-appearance: textfield !important;'), 'manager-app sets -moz-appearance: textfield for Firefox')
assert(managerCss.includes('appearance: textfield !important;'), 'manager-app sets standard appearance: textfield')

// 2. Verify CSS in staff-app
console.log('\n--- SECTION 2: STAFF APP CSS ---')
const staffCss = fs.readFileSync(path.resolve('staff-app/src/styles.css'), 'utf-8')
assert(staffCss.includes('::-webkit-outer-spin-button'), 'staff-app styles.css targets ::-webkit-outer-spin-button')
assert(staffCss.includes('::-webkit-inner-spin-button'), 'staff-app styles.css targets ::-webkit-inner-spin-button')
assert(staffCss.includes('-webkit-appearance: none !important;'), 'staff-app disables webkit appearance for spin buttons')
assert(staffCss.includes('-moz-appearance: textfield !important;'), 'staff-app sets -moz-appearance: textfield for Firefox')
assert(staffCss.includes('appearance: textfield !important;'), 'staff-app sets standard appearance: textfield')

// 3. Verify CSS in desktop-manager settings.html
console.log('\n--- SECTION 3: DESKTOP MANAGER SETTINGS HTML CSS ---')
const settingsHtml = fs.readFileSync(path.resolve('desktop-manager/src/settings.html'), 'utf-8')
assert(settingsHtml.includes('::-webkit-outer-spin-button'), 'settings.html targets ::-webkit-outer-spin-button')
assert(settingsHtml.includes('::-webkit-inner-spin-button'), 'settings.html targets ::-webkit-inner-spin-button')
assert(settingsHtml.includes('-webkit-appearance: none !important;'), 'settings.html disables webkit appearance for spin buttons')

// 4. Verify Keyboard Input & Wheel Protection in manager-app
console.log('\n--- SECTION 4: MANAGER APP KEYBOARD INPUT & WHEEL PROTECTION ---')
const managerJsx = fs.readFileSync(path.resolve('manager-app/src/main.jsx'), 'utf-8')
assert(managerJsx.includes("inputMode=\"decimal\""), 'manager-app uses inputMode="decimal" on numeric inputs')
assert(managerJsx.includes("e?.target?.select?.()"), 'EditableNumberInput auto-selects content on focus for instant keyboard replacement')
assert(managerJsx.includes("e.target.select?.()"), 'Field component auto-selects content on focus for number inputs')
assert(managerJsx.includes("onWheel={(e) => e.target.blur()}"), 'Direct inputs blur on wheel to prevent mouse-wheel spinning')
assert(managerJsx.includes("document.activeElement.type === 'number'"), 'manager-app has global wheel listener preventing number input spin')

// 5. Verify Keyboard Input & Wheel Protection in staff-app
console.log('\n--- SECTION 5: STAFF APP KEYBOARD INPUT & WHEEL PROTECTION ---')
const staffJsx = fs.readFileSync(path.resolve('staff-app/src/main.jsx'), 'utf-8')
assert(staffJsx.includes("inputMode=\"decimal\""), 'staff-app uses inputMode="decimal" on measurement inputs')
assert(staffJsx.includes("onFocus={(e) => e.target.select?.()}"), 'staff-app inputs auto-select on focus for instant typing')
assert(staffJsx.includes("onWheel={(e) => e.target.blur()}"), 'staff-app inputs blur on wheel to prevent mouse-wheel spinning')
assert(staffJsx.includes("document.activeElement.type === 'number'"), 'staff-app has global wheel listener preventing number input spin')

console.log('\n========================================================================')
console.log(`TOTAL CHECKS PASSED: ${passed}`)
console.log(`TOTAL CHECKS FAILED: ${failed}`)
console.log('========================================================================\n')

if (failed > 0) process.exit(1)
