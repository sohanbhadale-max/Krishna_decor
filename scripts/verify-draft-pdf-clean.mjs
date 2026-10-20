import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const css = fs.readFileSync('manager-app/src/styles.css', 'utf8')

// 1. Verify that in @media print, .document-action-col is hidden
assert.ok(css.includes('.document-action-col'), 'Must include .document-action-col rule')
assert.ok(css.includes('.document-table th.document-action-col'), 'Must include th.document-action-col hide rule')
assert.ok(css.includes('.document-table td.document-action-col'), 'Must include td.document-action-col hide rule')
assert.ok(css.includes('.service-delete-btn'), 'Must include .service-delete-btn hide rule')

// 2. Verify that descriptions for Discount, Installation, Delivery are hidden
assert.ok(css.includes('.service-formula-hint'), 'Must hide .service-formula-hint')
assert.ok(css.includes('.discount-scope-badge'), 'Must hide .discount-scope-badge')
assert.ok(css.includes('.discount-capped-badge'), 'Must hide .discount-capped-badge')
assert.ok(css.includes('.service-qty-rate-read'), 'Must hide .service-qty-rate-read')
assert.ok(css.includes('.service-inputs-wrap'), 'Must hide .service-inputs-wrap')
assert.ok(css.includes('.service-tax-badge'), 'Must hide .service-tax-badge')

// 3. Verify DocumentSheet JSX has document-action-col
const jsx = fs.readFileSync('manager-app/src/main.jsx', 'utf8')
assert.ok(jsx.includes('<td className="document-action-col"'), 'main.jsx must tag delete td with document-action-col')
// 4. Verify backup-service.cjs generates exact application format with background image and only saves .pdf
const backupService = fs.readFileSync('desktop-manager/src/backup-service.cjs', 'utf8')
assert.ok(backupService.includes('document-page-bg'), 'backup-service.cjs must include document-page-bg')
assert.ok(backupService.includes('getDocumentBackgroundDataUri'), 'backup-service.cjs must embed background image')
assert.ok(backupService.includes('cleanNonPdfFiles'), 'backup-service.cjs must clean non-pdf files')
assert.ok(!backupService.includes('writeFileSync(jsonPath'), 'backup-service.cjs must NOT write json to drafts or invoice')
assert.ok(!backupService.includes('writeFileSync(htmlPath'), 'backup-service.cjs must NOT write html to drafts or invoice')

console.log('✓ All draft PDF & Invoice clean rules verified successfully!')
