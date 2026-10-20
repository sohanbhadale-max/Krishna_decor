const { app } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')
const assert = require('assert')
const { BackupService, generateDocumentHtml } = require('../desktop-manager/src/backup-service.cjs')

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')
app.on('window-all-closed', (e) => { e && e.preventDefault ? e.preventDefault() : null })

app.whenReady().then(async () => {
  console.log('Testing BackupService under actual Electron environment...')

  const sampleProject = {
    id: 'proj-real-test',
    name: 'Royal Palace Residence',
    customer: {
      name: 'Mr. Arvind Rao',
      address: 'Road No 36, Jubilee Hills',
      location: 'Hyderabad'
    },
    quotations: [
      {
        id: 'KD-2026-REAL-01',
        title: 'Option A - Velvet Linen',
        date: '2026-10-19',
        status: 'Approved',
        items: [
          { product: 'American main curtain', quantity: 18.5, unitPrice: 1250, gst: 12 },
          { product: 'American sheer', quantity: 18.5, unitPrice: 680, gst: 12 },
          { product: 'American Stitching', quantity: 8, unitPrice: 90, gst: 18 },
          { product: 'Track', quantity: 24, unitPrice: 120, gst: 18 },
          { product: 'Runners', quantity: 72, unitPrice: 5, gst: 18 },
          { product: 'Discount', quantity: 1, unitPrice: 2000, gst: 0, isDiscount: true },
          { product: 'Installation', quantity: 2, unitPrice: 750, gst: 18, isInstallationService: true },
          { product: 'Delivery', quantity: 1, unitPrice: 350, gst: 18, isDeliveryService: true }
        ]
      }
    ]
  }

  const testRoot = path.join(os.tmpdir(), 'kd_electron_test_' + Date.now())
  let configStore = {}
  const backup = new BackupService({
    readConfigFn: () => configStore,
    writeConfigFn: (next) => { configStore = { ...next } }
  })

  backup.setBackupDirectory(testRoot)

  try {
    const syncResult = await backup.syncAllProjects([sampleProject])
    console.log('syncResult:', syncResult)
    assert.strictEqual(syncResult.success, true)
  } catch (err) {
    console.error('ERROR in syncAllProjects:', err.stack)
    app.exit(1)
    return
  }

  const projDir = path.join(testRoot, 'backup_krishna_decor', 'Royal Palace Residence')
  const draftsDir = path.join(projDir, 'drafts')
  const invoiceDir = path.join(projDir, 'invoice')

  assert.ok(fs.existsSync(draftsDir), 'drafts dir must exist')
  assert.ok(fs.existsSync(invoiceDir), 'invoice dir must exist')

  const draftFiles = fs.readdirSync(draftsDir)
  const invoiceFiles = fs.readdirSync(invoiceDir)

  console.log('Drafts folder contents:', draftFiles)
  console.log('Invoice folder contents:', invoiceFiles)

  // Verify ONLY .pdf files exist
  assert.ok(draftFiles.length > 0, 'Draft files must exist')
  assert.ok(draftFiles.every(f => f.endsWith('.pdf')), 'ONLY .pdf files must be in drafts')
  assert.ok(invoiceFiles.length > 0, 'Invoice files must exist')
  assert.ok(invoiceFiles.every(f => f.endsWith('.pdf')), 'ONLY .pdf files must be in invoice')

  // Verify PDF file contents are valid PDFs (starts with %PDF)
  for (const f of draftFiles) {
    const filePath = path.join(draftsDir, f)
    const buf = fs.readFileSync(filePath)
    assert.ok(buf.length > 1000, `PDF ${f} should have non-trivial size (actual: ${buf.length} bytes)`)
    assert.strictEqual(buf.slice(0, 4).toString(), '%PDF', `File ${f} must be a valid PDF starting with %PDF`)
    console.log(`✓ Draft PDF ${f}: valid PDF (${buf.length} bytes)`)
  }

  for (const f of invoiceFiles) {
    const filePath = path.join(invoiceDir, f)
    const buf = fs.readFileSync(filePath)
    assert.ok(buf.length > 1000, `PDF ${f} should have non-trivial size (actual: ${buf.length} bytes)`)
    assert.strictEqual(buf.slice(0, 4).toString(), '%PDF', `File ${f} must be a valid PDF starting with %PDF`)
    console.log(`✓ Invoice PDF ${f}: valid PDF (${buf.length} bytes)`)
  }

  // Check HTML generated: verify no delete buttons, background image embedded
  const html = generateDocumentHtml(sampleProject, sampleProject.quotations[0], false, 'KD-2026-REAL-01')
  assert.ok(html.includes('document-sheet'))
  assert.ok(html.includes('document-page-bg'))
  assert.ok(html.includes('data:image/jpeg;base64,'))
  assert.ok(!html.includes('service-delete-btn'))
  assert.ok(!html.includes('document-action-col'))
  assert.ok(!html.includes('service-formula-hint'))
  assert.ok(!html.includes('service-inputs-wrap'))
  assert.ok(html.includes('8 panels'))
  assert.ok(html.includes('Discount'))
  assert.ok(html.includes('-₹2,000.00'))

  // Clean up
  try { fs.rmSync(testRoot, { recursive: true, force: true }) } catch {}

  console.log('✅ ALL ELECTRON BACKUP SERVICE VERIFICATIONS PASSED!')
  app.exit(0)
})
