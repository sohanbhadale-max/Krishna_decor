import fs from 'node:fs'
import path from 'node:path'

const filesToCheck = [
  'manager-app/src/main.jsx',
  'manager-app/src/styles.css',
  'staff-app/src/main.jsx',
  'staff-app/src/styles.css',
  'desktop-manager/src/main.cjs',
  'desktop-manager/src/settings.html',
]

// Add built dist assets
const managerDist = 'manager-app/dist/assets'
if (fs.existsSync(managerDist)) {
  for (const file of fs.readdirSync(managerDist)) {
    filesToCheck.push(path.join(managerDist, file))
  }
}
const staffDist = 'staff-app/dist/assets'
if (fs.existsSync(staffDist)) {
  for (const file of fs.readdirSync(staffDist)) {
    filesToCheck.push(path.join(staffDist, file))
  }
}

console.log('--- SCANNING FILES FOR ANY TRACE OF "OFFICIAL PDF" OR "OFFICIAL INVOICE" ---')

let failures = 0
for (const relPath of filesToCheck) {
  if (!fs.existsSync(relPath)) continue
  const content = fs.readFileSync(relPath, 'utf8')
  const officialPdfMatch = content.match(/official[\s_-]*pdf/i)
  const officialInvoiceMatch = content.match(/official[\s_-]*invoice/i)
  const officialMatch = content.match(/official/i)

  if (officialPdfMatch || officialInvoiceMatch) {
    console.error(`❌ FAIL: Found in ${relPath}:`, { officialPdfMatch, officialInvoiceMatch })
    failures++
  } else {
    console.log(`✅ PASS: ${relPath} has no official PDF or official invoice references`)
  }
}

// Check Quotation action buttons in main.jsx
const mainContent = fs.readFileSync('manager-app/src/main.jsx', 'utf8')

console.log('\n--- VERIFYING QUOTATION SECTION BUTTONS IN manager-app/src/main.jsx ---')
const quoteSectionMatch = mainContent.match(/function Quotations\([\s\S]*?<div className="quote-actions">([\s\S]*?)<\/div>/)
if (quoteSectionMatch) {
  const quoteButtons = quoteSectionMatch[1]
  console.log('Quotation buttons markup:\n', quoteButtons.trim())
  const hasOfficialInQuote = /official/i.test(quoteButtons)
  if (hasOfficialInQuote) {
    console.error('❌ FAIL: Quotations still contains official button!')
    failures++
  } else {
    console.log('✅ PASS: Quotations section has NO official button.')
  }
} else {
  console.warn('⚠️ Could not isolate Quotations actions block')
}

console.log('\n--- VERIFYING INVOICE SECTION BUTTONS IN manager-app/src/main.jsx ---')
const invoiceSectionMatch = mainContent.match(/function Invoice\([\s\S]*?<div className="quote-actions">([\s\S]*?)<\/div>/)
if (invoiceSectionMatch) {
  const invoiceButtons = invoiceSectionMatch[1]
  console.log('Invoice buttons markup:\n', invoiceButtons.trim())
  const hasOfficialInInvoice = /official/i.test(invoiceButtons)
  if (hasOfficialInInvoice) {
    console.error('❌ FAIL: Invoice still contains official button!')
    failures++
  } else {
    console.log('✅ PASS: Invoice section has NO official button.')
  }
} else {
  console.warn('⚠️ Could not isolate Invoice actions block')
}

console.log('\n======================================================')
if (failures === 0) {
  console.log('🎉 ALL TESTS PASSED: "Official PDF" and "Official Invoice PDF" are 100% removed!')
  process.exit(0)
} else {
  console.error(`💥 ${failures} check(s) failed!`)
  process.exit(1)
}
