const assert = require('node:assert')
const { existsSync, rmSync, readFileSync, readdirSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { BackupService, sanitizeName, computeTotals, generateDocumentHtml } = require('../src/backup-service.cjs')

async function runTests() {
  console.log('Testing BackupService...')

  // 1. Test sanitizeName
  assert.strictEqual(sanitizeName('Project: Alpha / Beta * Gamma?'), 'Project_ Alpha _ Beta _ Gamma_')
  assert.strictEqual(sanitizeName(''), 'Unnamed')
  assert.strictEqual(sanitizeName('   Villa 42.  '), 'Villa 42')
  console.log('✓ sanitizeName passed')

  // 2. Test computeTotals
  const sampleItems = [
    { product: 'Curtains', quantity: 2, unitPrice: 5000, gst: 18 },
    { product: 'Hardware track', quantity: 10, unitPrice: 200, gst: 18 },
    { product: 'Stitching', quantity: 1, unitPrice: 1500, gst: 5 }
  ]
  const totals = computeTotals(sampleItems)
  assert.strictEqual(totals.untaxed, 13500)
  assert.strictEqual(totals.tax, 2235) // (10000*0.18 + 2000*0.18 + 1500*0.05) = 1800 + 360 + 75 = 2235
  assert.strictEqual(totals.total, 15735)
  console.log('✓ computeTotals passed')

  // 3. Test generateDocumentHtml
  const sampleProject = {
    id: 'proj-1',
    name: 'Luxury Residence 101',
    customer: {
      name: 'Mr. Arvind Rao',
      address: 'Road No 36, Jubilee Hills',
      location: 'Hyderabad'
    }
  }
  const sampleQuotation = {
    id: 'KD-2026-001',
    title: 'Option A - Velvet Linen',
    date: '2026-10-19',
    status: 'Approved',
    items: sampleItems
  }

  const quoteHtml = generateDocumentHtml(sampleProject, sampleQuotation, false, 'KD-2026-001')
  assert.ok(quoteHtml.includes('Quotation #KD-2026-001'))
  assert.ok(quoteHtml.includes('Option A - Velvet Linen'))
  assert.ok(quoteHtml.includes('Mr. Arvind Rao'))
  assert.ok(quoteHtml.includes('Luxury Residence 101'))
  assert.ok(quoteHtml.includes('Krishna Decor'))
  assert.ok(quoteHtml.includes('SPACES DRESSED BEAUTIFULLY'))
  assert.ok(quoteHtml.includes('CTS NO - 1813|2B|2'))
  assert.ok(quoteHtml.includes('document-page-bg'), 'Must include document-page-bg element for multi-page background')
  assert.ok(quoteHtml.includes('data:image/jpeg;base64,'), 'Must embed background image as base64 data URI')
  assert.strictEqual(quoteHtml.includes('service-delete-btn'), false, 'Delete button must NOT be present in document HTML')
  assert.strictEqual(quoteHtml.includes('document-action-col'), false, 'Action/delete column must NOT be present in document HTML')
  assert.strictEqual(quoteHtml.includes('service-formula-hint'), false, 'Formula hints must NOT be present in document HTML')
  assert.ok(quoteHtml.includes('₹15,735.00'))

  // Verify draft PDF displays clean material name and omits notes/specifications
  const sampleDraftWithNotes = {
    id: 'KD-2026-DRAFT-NOTES',
    title: 'Draft with Notes and Specs',
    date: '2026-10-19',
    status: 'Draft',
    items: [
      { product: 'Curtains - Measurement 1 (3 panels, 2.5m drop)', note: 'Specification: 100% Blackout pinch pleat', quantity: 2, unitPrice: 3000, gst: 18 }
    ]
  }
  const draftWithNotesHtml = generateDocumentHtml(sampleProject, sampleDraftWithNotes, false, 'KD-2026-DRAFT-NOTES')
  assert.ok(draftWithNotesHtml.includes('Curtains'), 'Draft PDF must include material/product name')
  assert.strictEqual(draftWithNotesHtml.includes('Measurement 1'), false, 'Draft PDF must not include measurement specs in product name')
  assert.strictEqual(draftWithNotesHtml.includes('3 panels'), false, 'Draft PDF must not include formula/panel specs in product name')
  assert.strictEqual(draftWithNotesHtml.includes('Specification: 100% Blackout pinch pleat'), false, 'Draft PDF must not display item.note/specifications')

  const invoiceHtml = generateDocumentHtml(sampleProject, sampleQuotation, true, 'KD-2026-001')
  assert.ok(invoiceHtml.includes('Tax Invoice #KD-2026-001'))
  assert.ok(invoiceHtml.includes('GSTIN: 29AWZPK1722G1Z4'))
  assert.ok(invoiceHtml.includes('data:image/jpeg;base64,'), 'Must embed background image in invoice')
  assert.strictEqual(invoiceHtml.includes('service-delete-btn'), false, 'Delete button must NOT be present in invoice HTML')
  assert.ok(invoiceHtml.includes('₹15,735.00'))
  console.log('✓ generateDocumentHtml passed with background image, clean material names, and no notes/specs')

  // 4. Test BackupService directory creation and sync
  const testRoot = join(tmpdir(), 'kd_test_' + Date.now())
  let configStore = {}
  const backup = new BackupService({
    readConfigFn: () => configStore,
    writeConfigFn: (next) => { configStore = { ...next } }
  })

  // Set location
  const finalDir = backup.setBackupDirectory(testRoot)
  assert.strictEqual(finalDir, join(testRoot, 'backup_krishna_decor'))
  assert.ok(existsSync(finalDir))
  console.log('✓ setBackupDirectory created:', finalDir)

  // Sync projects
  const syncResult = await backup.syncAllProjects([
    {
      id: 'proj-1',
      name: 'Luxury Residence 101',
      customer: { name: 'Mr. Arvind Rao', address: 'Jubilee Hills' },
      quotations: [
        sampleQuotation,
        {
          id: 'KD-2026-002',
          title: 'Draft 2 - Minimal Sheer',
          date: '2026-10-19',
          status: 'Draft',
          items: [{ product: 'Sheer curtain', quantity: 4, unitPrice: 2000, gst: 5 }]
        }
      ]
    },
    {
      id: 'proj-2',
      name: 'Skyline Penthouse',
      customer: { name: 'Dr. Meera Sen' },
      quotations: [] // New project with no drafts yet
    }
  ])

  assert.strictEqual(syncResult.success, true)
  assert.strictEqual(syncResult.syncedProjects, 2)
  console.log('✓ syncAllProjects synced 2 projects')

  // Verify folder structure:
  // backup_krishna_decor/Luxury Residence 101/drafts
  // backup_krishna_decor/Luxury Residence 101/invoice
  // backup_krishna_decor/Skyline Penthouse/drafts
  // backup_krishna_decor/Skyline Penthouse/invoice
  const proj1Dir = join(finalDir, 'Luxury Residence 101')
  const proj1Drafts = join(proj1Dir, 'drafts')
  const proj1Invoice = join(proj1Dir, 'invoice')
  assert.ok(existsSync(proj1Drafts), 'Drafts folder must exist')
  assert.ok(existsSync(proj1Invoice), 'Invoice folder must exist')

  const proj2Dir = join(finalDir, 'Skyline Penthouse')
  const proj2Drafts = join(proj2Dir, 'drafts')
  const proj2Invoice = join(proj2Dir, 'invoice')
  assert.ok(existsSync(proj2Drafts), 'Drafts folder for proj-2 must exist')
  assert.ok(existsSync(proj2Invoice), 'Invoice folder for proj-2 must exist')

  // Check files in proj1Drafts: ONLY .pdf format allowed
  const draftFiles = readdirSync(proj1Drafts)
  console.log('Drafts folder contents:', draftFiles)
  assert.ok(draftFiles.length > 0, 'PDF drafts must exist')
  assert.ok(draftFiles.every(f => f.endsWith('.pdf')), 'ONLY .pdf format should be saved in drafts folder')
  assert.strictEqual(draftFiles.some(f => f.endsWith('.json')), false, 'No .json files should be in drafts')
  assert.strictEqual(draftFiles.some(f => f.endsWith('.html')), false, 'No .html files should be in drafts')

  // Check files in proj1Invoice: ONLY .pdf format allowed
  const invoiceFiles = readdirSync(proj1Invoice)
  console.log('Invoice folder contents:', invoiceFiles)
  assert.ok(invoiceFiles.length > 0, 'PDF invoice must exist')
  assert.ok(invoiceFiles.every(f => f.endsWith('.pdf')), 'ONLY .pdf format should be saved in invoice folder')
  assert.strictEqual(invoiceFiles.some(f => f.endsWith('.json')), false, 'No .json files should be in invoice')
  assert.strictEqual(invoiceFiles.some(f => f.endsWith('.html')), false, 'No .html files should be in invoice')
  assert.ok(invoiceFiles.some(f => f.startsWith('Tax-Invoice-KD-2026-001') && f.endsWith('.pdf')), 'PDF invoice must have correct name')

  // Check stats
  const stats = backup.getStats()
  assert.strictEqual(stats.configured, true)
  assert.strictEqual(stats.projectCount, 2)
  console.log('Stats:', stats)
  console.log('✓ All folder structure and file assertions verified!')

  // Clean up test dir
  try { rmSync(testRoot, { recursive: true, force: true }) } catch {}
  console.log('ALL TESTS PASSED!')
}

runTests().catch(err => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
