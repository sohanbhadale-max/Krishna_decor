import { execSync } from 'node:child_process'

const tests = [
  'desktop-manager/scripts/test-backup-service.cjs',
  'scripts/test-spin-buttons-and-keyboard-inputs.mjs',
  'scripts/test-discount-section-table3.mjs',
  'scripts/test-stitching-panels-table2.mjs',
  'scripts/test-fast-typing-inputs.mjs',
  'scripts/test-curtain-formulas-and-unification.mjs',
  'scripts/test-multiple-measurements.mjs',
  'scripts/test-staff-manual-materials.mjs',
  'scripts/test-invoice-no-calculation-description.mjs',
  'scripts/test-all-three-apps.mjs',
  'scripts/test-three-apps-integrated.mjs',
  'scripts/test-sync-e2e.mjs',
  'scripts/test-manager-edit-staff.mjs',
  'scripts/test-staff-delete-full.mjs',
  'scripts/test-staff-permanent-deletion.mjs',
  'scripts/test-installation-delivery-requirements.mjs',
  'scripts/test-user-requirements-full.mjs',
  'scripts/test-user-requirements-new.mjs',
  'scripts/verify-no-official-pdf.mjs',
  'scripts/verify-draft-pdf-clean.mjs',
  'scripts/test-hardware-in-products.mjs',
  'scripts/test-desktop-local-sync.mjs',
  'scripts/test-pdf-save-and-spin-buttons.mjs'
]

console.log('========================================================================')
console.log('  RUNNING ALL VERIFICATION TEST SUITES FOR KRISHNA DECOR (ALL 3 APPS)')
console.log('========================================================================\n')

let passCount = 0
let failCount = 0

for (const t of tests) {
  process.stdout.write(`• Running ${t} ... `)
  try {
    execSync(`node ${t}`, { stdio: 'pipe' })
    console.log('\x1b[32mPASSED\x1b[0m')
    passCount++
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m')
    console.error(err.stdout ? err.stdout.toString() : err.message)
    failCount++
  }
}

console.log('\n========================================================================')
console.log(`TOTAL SUITES PASSED: ${passCount} / ${tests.length}`)
console.log(`TOTAL SUITES FAILED: ${failCount} / ${tests.length}`)
console.log('========================================================================\n')

if (failCount > 0) process.exit(1)
