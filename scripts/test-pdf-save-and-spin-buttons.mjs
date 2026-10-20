import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { generateDocumentHtml, computeTotals } from '../desktop-manager/src/backup-service.cjs'

console.log('========================================================================')
console.log('=== TEST SUITE: PDF SAME FORMAT AS BACKUP & REMOVAL OF SPIN BUTTONS ===')
console.log('========================================================================\n')

let passed = 0
let failed = 0

function testAssert(condition, message) {
  if (condition) {
    console.log('  \x1b[32m[PASS]\x1b[0m', message)
    passed++
  } else {
    console.error('  \x1b[31m[FAIL]\x1b[0m', message)
    failed++
  }
}

// -------------------------------------------------------------
// 1. Verify desktop-manager IPC handler and preload bridge
// -------------------------------------------------------------
console.log('--- 1. Desktop Manager saveDocumentPdf IPC & Bridge ---')
const mainCjs = fs.readFileSync(path.resolve('desktop-manager/src/main.cjs'), 'utf-8')
const preloadCjs = fs.readFileSync(path.resolve('desktop-manager/src/preload.cjs'), 'utf-8')

testAssert(mainCjs.includes("ipcMain.handle('hub:save-document-pdf'"), "main.cjs registers 'hub:save-document-pdf' IPC handler")
testAssert(mainCjs.includes("generateDocumentHtml(project, quote, isInv, docNum)"), "main.cjs uses generateDocumentHtml to generate exact backup document HTML")
testAssert(mainCjs.includes("backupService.renderHtmlToPdf(htmlContent, filePath)"), "main.cjs uses backupService.renderHtmlToPdf to render pixel-perfect PDF")
testAssert(preloadCjs.includes("saveDocumentPdf: (payload) => ipcRenderer.invoke('hub:save-document-pdf', payload)"), "preload.cjs exposes saveDocumentPdf on window.krishnaHub")

// -------------------------------------------------------------
// 2. Verify manager-app Quotation & Invoice buttons invoke saveDocumentPdf
// -------------------------------------------------------------
console.log('\n--- 2. Manager App Quotation & Invoice PDF Integration ---')
const mainJsx = fs.readFileSync(path.resolve('manager-app/src/main.jsx'), 'utf-8')

testAssert(mainJsx.includes("import documentBg from './assets/document-bg.jpg'"), 'main.jsx imports documentBg image')
testAssert(mainJsx.includes("window.krishnaHub?.saveDocumentPdf"), 'main.jsx calls window.krishnaHub.saveDocumentPdf when saving PDF')
testAssert(mainJsx.includes("backgroundImage: `url(${documentBg})`"), 'main.jsx applies documentBg as background on document-sheet')
testAssert(mainJsx.includes("unifyQuoteItems(quote.items || [])"), 'Quotation PDF passes unified items (tracks, runners, hooks, clamps at bottom)')

// -------------------------------------------------------------
// 3. Verify Spin Button Removal in EditableNumberInput & CSS
// -------------------------------------------------------------
console.log('\n--- 3. Spin Button Removal in UI & CSS ---')
const stylesCss = fs.readFileSync(path.resolve('manager-app/src/styles.css'), 'utf-8')

testAssert(mainJsx.includes("e.key === 'ArrowUp' || e.key === 'ArrowDown'"), 'EditableNumberInput blocks ArrowUp and ArrowDown spin keys')
testAssert(mainJsx.includes("appearance: 'textfield'"), 'EditableNumberInput sets inline appearance: textfield')

testAssert(stylesCss.includes(".document-table input::-webkit-outer-spin-button"), 'styles.css targets .document-table spin buttons')
testAssert(stylesCss.includes(".document-table input::-webkit-inner-spin-button"), 'styles.css targets .document-table inner spin buttons')
testAssert(stylesCss.includes(".price-input input::-webkit-outer-spin-button"), 'styles.css targets .price-input spin buttons')
testAssert(stylesCss.includes(".price-input input::-webkit-inner-spin-button"), 'styles.css targets .price-input inner spin buttons')
testAssert(stylesCss.includes(".service-inline-field input::-webkit-outer-spin-button"), 'styles.css targets .service-inline-field spin buttons')
testAssert(stylesCss.includes("display: none !important;"), 'styles.css hides spin buttons with display: none !important')
testAssert(stylesCss.includes("opacity: 0 !important;"), 'styles.css hides spin buttons with opacity: 0 !important')
testAssert(stylesCss.includes("pointer-events: none !important;"), 'styles.css disables pointer events on spin buttons')

// -------------------------------------------------------------
// 4. Verify Document HTML matches backup format exactly
// -------------------------------------------------------------
console.log('\n--- 4. Verify Document HTML Matches Backup Format ---')
const sampleProject = {
  id: 'proj-demo-1',
  name: 'Ocean View Penthouse',
  customer: {
    name: 'Mrs. Ananya Sharma',
    address: '14B Marine Drive',
    location: 'Mumbai'
  }
}
const sampleQuote = {
  id: 'KD-2026-999',
  title: 'Luxury Option',
  date: '2026-10-19',
  items: [
    { product: 'Tracks', quantity: 8, unitPrice: 150, gst: 18, isAutoHardware: true },
    { product: 'Runners', quantity: 24, unitPrice: 10, gst: 18, isAutoHardware: true },
    { product: 'Hooks', quantity: 24, unitPrice: 5, gst: 18, isAutoHardware: true },
    { product: 'Ceiling Clamps', quantity: 4, unitPrice: 40, gst: 18, isAutoHardware: true },
    { product: 'Roller blinds', quantity: 15, unitPrice: 200, gst: 18 }
  ]
}

const quoteHtml = generateDocumentHtml(sampleProject, sampleQuote, false, sampleQuote.id)
testAssert(quoteHtml.includes('Quotation #KD-2026-999'), 'Quotation document number rendered')
testAssert(quoteHtml.includes('Ocean View Penthouse'), 'Project name rendered')
testAssert(quoteHtml.includes('Mrs. Ananya Sharma'), 'Customer name rendered')
testAssert(quoteHtml.includes('document-page-bg'), 'document-page-bg present')
testAssert(quoteHtml.includes('data:image/jpeg;base64,'), 'Embedded base64 background image present')
testAssert(!quoteHtml.includes('<input'), 'No input tags in generated PDF HTML (clean static text)')

const invoiceHtml = generateDocumentHtml(sampleProject, sampleQuote, true, 'KD-2026-999')
testAssert(invoiceHtml.includes('Tax Invoice #KD-2026-999'), 'Tax Invoice title rendered')
testAssert(!invoiceHtml.includes('<input'), 'No input tags in generated Tax Invoice PDF HTML')

console.log('\n========================================================================')
console.log(`TOTAL CHECKS PASSED: ${passed}`)
console.log(`TOTAL CHECKS FAILED: ${failed}`)
console.log('========================================================================\n')

if (failed > 0) process.exit(1)
