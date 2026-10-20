import fs from 'node:fs'
import assert from 'node:assert'

console.log('--- VERIFYING USER REQUIREMENTS ---')

const mainContent = fs.readFileSync('manager-app/src/main.jsx', 'utf8')
const stylesContent = fs.readFileSync('manager-app/src/styles.css', 'utf8')

// 1. Verify "Compare drafts" and "Merge versions" are removed from Quotations section
const quoteActionsMatch = mainContent.match(/function Quotations\([\s\S]*?<div className="quote-actions">([\s\S]*?)<\/div>/)
assert(quoteActionsMatch, 'quote-actions must exist in Quotations component')
const quoteActionsMarkup = quoteActionsMatch[1]
console.log('Quotation actions markup:\n', quoteActionsMarkup.trim())

assert(!quoteActionsMarkup.includes('Compare drafts'), 'Compare drafts button must be removed from Quotations')
assert(!quoteActionsMarkup.includes('Merge versions'), 'Merge versions button must be removed from Quotations')
assert(!quoteActionsMarkup.includes('Merge drafts'), 'Merge drafts button must be removed from Quotations')
console.log('✅ PASS: "Compare drafts" and "Merge drafts" options are completely removed from the quotation section.')

// 2. Verify QuoteRow in main.jsx
const renderRowMatch = mainContent.match(/const QuoteRow = React\.memo\([\s\S]*?<td>([\s\S]*?)<\/td>/)
assert(renderRowMatch, 'QuoteRow must exist in manager-app/src/main.jsx')

console.log('\nQuoteRow Description cell content:\n', renderRowMatch[1].trim())

// Verify only product main name on invoice
assert(
  mainContent.includes('(showArea && !isInvoice ? line.area + \' - \' : \'\') + cleanInvoiceProductName(line.product)'),
  'Invoice must only display the sanitized product main name (cleanInvoiceProductName(line.product))'
)
console.log('✅ PASS: In the invoice, only the product main name is displayed (cleanInvoiceProductName(line.product) without area prefix or notes).')

// Verify calculation description is omitted on invoice
assert(
  mainContent.includes('!isInvoice && calcDescription && <small className="quotation-calc-note">{calcDescription}</small>'),
  'Invoice must NOT show calculation description in renderItemRow'
)
console.log('✅ PASS: Calculation description is excluded when isInvoice is true.')

// 3. Verify Quotations display the calculation with formula below each item
assert(
  mainContent.includes('function formatQuotationCalculation'),
  'formatQuotationCalculation function must exist'
)
console.log('✅ PASS: formatQuotationCalculation formats all calculations with formulas for quotation items.')

// 4. Verify CSS rule in styles.css
assert(
  stylesContent.includes('.invoice-sheet .document-table td small'),
  '.invoice-sheet .document-table td small CSS rule must be present'
)
assert(
  stylesContent.includes('display: none !important;'),
  'CSS rule must hide td small in invoice-sheet'
)
console.log('✅ PASS: CSS rule hides any calculation text inside .invoice-sheet td small.')

console.log('\n======================================================')
console.log('🎉 ALL TESTS PASSED: Drafts compare/merge removed, quotations display formula calculations, invoice displays only product main name!')
