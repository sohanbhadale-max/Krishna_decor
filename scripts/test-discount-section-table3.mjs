import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

// Test script verifying Table 3 Discount section requirements:
// 1. Discount section just below untaxed amount in Table 3
// 2. Deletable
// 3. Entered manually
// 4. Applicable only to the untaxed amount (capped at untaxed amount)
// 5. Deducted from total
// 6. Excluded from Table 1 and Table 2

console.log('Testing Discount Section Requirements...')

// 1. Test calculation logic directly
function isDiscountLine(line) {
  if (!line) return false
  if (line.isDiscount) return true
  const p = String(line.product || '').toLowerCase().trim()
  return p === 'discount' || p.includes('discount')
}

function isInstallationService(line) {
  if (!line) return false
  if (line.isInstallationService) return true
  const p = String(line.product || '').toLowerCase().trim()
  return p === 'installation' || p.includes('installation') || p === 'fitting'
}

function isDeliveryService(line) {
  if (!line) return false
  if (line.isDeliveryService) return true
  const p = String(line.product || '').toLowerCase().trim()
  return p === 'delivery' || p.includes('delivery') || p === 'transport' || p === 'shipping' || p === 'freight'
}

function getTotals(items, quoteOrDiscount = null) {
  if (!Array.isArray(items)) return { untaxed: 0, regularUntaxed: 0, discount: 0, rawDiscount: 0, tax5: 0, tax18: 0, tax: 0, total: 0 }
  const regularItems = items.filter((item) => !isDiscountLine(item))
  const regularUntaxed = regularItems
    .filter((item) => !isInstallationService(item) && !isDeliveryService(item))
    .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)

  const untaxed = regularItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  const tax5 = regularItems.filter((item) => Number(item.gst) === 5).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * 0.05, 0)
  const tax18 = regularItems.filter((item) => Number(item.gst) === 18).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * 0.18, 0)
  const tax = tax5 + tax18

  const discountLine = items.find((item) => isDiscountLine(item))
  const rawDiscount = discountLine
    ? (Number(discountLine.unitPrice) || 0)
    : (typeof quoteOrDiscount === 'number' ? quoteOrDiscount : (Number(quoteOrDiscount?.discount) || 0))
  const discount = Math.min(Math.max(0, rawDiscount), regularUntaxed)

  const total = Math.max(0, (untaxed + tax) - discount)

  return { untaxed, regularUntaxed, discount, rawDiscount, tax5, tax18, tax, total }
}

// Case A: Normal items with ₹2,000 manual discount
const sampleItems = [
  { id: 'item-1', product: 'American Main Curtain', quantity: 2, unitPrice: 5000, gst: 18 }, // untaxed = 10,000, tax18 = 1,800
  { id: 'item-2', product: 'Track', quantity: 10, unitPrice: 200, gst: 18, isAutoHardware: true }, // untaxed = 2,000, tax18 = 360
  { id: 'item-inst', product: 'Installation', quantity: 2, unitPrice: 500, gst: 18, isInstallationService: true }, // untaxed = 1,000, tax18 = 180
  { id: 'item-disc', product: 'Discount', quantity: 1, unitPrice: 2000, gst: 0, isDiscount: true } // manual discount = 2,000
]

const totalsA = getTotals(sampleItems)
assert.strictEqual(totalsA.regularUntaxed, 12000, 'Regular untaxed amount should be 12,000 (excluding installation and discount)')
assert.strictEqual(totalsA.untaxed, 13000, 'Total untaxed should be 13,000')
assert.strictEqual(totalsA.tax, 2340, 'Total tax should be 2,340 (18% of 13,000)')
assert.strictEqual(totalsA.discount, 2000, 'Discount should be 2,000')
// Total before discount = 13,000 + 2,340 = 15,340. Deduct discount 2,000 = 13,340.
assert.strictEqual(totalsA.total, 13340, 'Total must deduct the 2,000 discount: 15,340 - 2,000 = 13,340')
console.log('✓ Normal manual discount deduction verified')

// Case B: Discount capping: Discount cannot exceed regularUntaxed amount
const sampleItemsCapped = [
  { id: 'item-1', product: 'American Main Curtain', quantity: 1, unitPrice: 5000, gst: 18 }, // regularUntaxed = 5,000
  { id: 'item-inst', product: 'Installation', quantity: 1, unitPrice: 1000, gst: 18, isInstallationService: true }, // service = 1,000
  { id: 'item-disc', product: 'Discount', quantity: 1, unitPrice: 99999, gst: 0, isDiscount: true } // Excessive manual discount
]

const totalsB = getTotals(sampleItemsCapped)
assert.strictEqual(totalsB.regularUntaxed, 5000, 'Regular untaxed is 5,000')
assert.strictEqual(totalsB.rawDiscount, 99999, 'Raw discount is 99,999')
assert.strictEqual(totalsB.discount, 5000, 'Discount must be capped at untaxed amount (5,000)')
// Total = (5,000 + 1,000) + 1,080 tax - 5,000 discount = 2,080
assert.strictEqual(totalsB.total, 2080, 'Total properly preserves service fee and taxes beyond untaxed amount')
console.log('✓ Manual discount capped at untaxed amount verified')

// Case C: Deleting discount
const itemsAfterDelete = sampleItems.filter(l => l.id !== 'item-disc')
const totalsC = getTotals(itemsAfterDelete)
assert.strictEqual(totalsC.discount, 0, 'Discount should be 0 after deletion')
assert.strictEqual(totalsC.total, 15340, 'Total restores to 15,340 without discount')
console.log('✓ Discount deletion verified')

// 2. Verify manager-app/src/main.jsx structure & layout
const mainJsx = fs.readFileSync('manager-app/src/main.jsx', 'utf8')

// Verify Table 1 (productItems) and Table 2 (accessoryItems) filter out Discount
assert(mainJsx.includes('!isDiscountLine(item)'), 'main.jsx must filter out !isDiscountLine(item)')
assert(mainJsx.includes('function isDiscountLine('), 'main.jsx must define isDiscountLine')

// Verify Discount section is placed just below Untaxed Amount in Table 3
const untaxedPos = mainJsx.indexOf('<Total label="Untaxed Amount" value={regularItemsUntaxed} />')
const discountPos = mainJsx.indexOf('className="service-total-row discount-total-row"')
const installationPos = mainJsx.indexOf('className="service-total-row installation-service-row"')

assert(untaxedPos !== -1, 'Untaxed Amount must exist in Table 3')
assert(discountPos !== -1, 'Discount section must exist in Table 3')
assert(installationPos !== -1, 'Installation section must exist in Table 3')
assert(discountPos > untaxedPos, 'Discount section must be below Untaxed Amount')
assert(installationPos > discountPos, 'Discount section must be immediately below Untaxed Amount and before Installation')
console.log('✓ Discount section position in Table 3 verified (immediately below Untaxed Amount)')

// Verify deletability & quick-add
assert(mainJsx.includes('title="Delete Discount from quotation"'), 'Discount must have delete button')
assert(mainJsx.includes('+ Add Discount'), 'Quick-add bar must have + Add Discount button')
console.log('✓ Deletability and quick-add button verified')

// Verify manual input
assert(mainJsx.includes('ariaLabel="Discount amount"'), 'Editable manual input for discount must exist')
assert(mainJsx.includes('applicableDiscount > 0 ? `-${currency(applicableDiscount)}`'), 'Discount display must show deducted amount')
console.log('✓ Manual input and deducted display verified')

// 3. Verify styles.css
const stylesCss = fs.readFileSync('manager-app/src/styles.css', 'utf8')
assert(stylesCss.includes('.discount-total-row'), 'styles.css must include .discount-total-row')
assert(stylesCss.includes('.discount-scope-badge'), 'styles.css must include .discount-scope-badge')
assert(stylesCss.includes('.discount-val'), 'styles.css must include .discount-val')
assert(stylesCss.includes('.discount-capped-badge'), 'styles.css must include .discount-capped-badge')
console.log('✓ CSS styles for discount section verified')

// 4. Verify desktop-manager backup-service.cjs
const backupService = fs.readFileSync('desktop-manager/src/backup-service.cjs', 'utf8')
assert(backupService.includes('isDiscountLine'), 'backup-service.cjs must define isDiscountLine')
assert(backupService.includes('discount-row'), 'backup-service.cjs must render discount row in totals-box')
console.log('✓ backup-service.cjs updated and verified')

console.log('\nAll discount section tests passed successfully! 🎉')
