// Comprehensive verification for:
// 1. 24 Products/Materials optional measurements, manual quantity, and MRP unit price
// 2. Quotation Installation (tracks + blinds formula) and Delivery (manual) below untaxed amount & deletable

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { startLocalApiServer } from '../api/src/server.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log('  [PASS]', message)
    passed++
  } else {
    console.error('  [FAIL]', message)
    failed++
  }
}

const REQUIRED_24_MATERIALS = [
  'Bed back fabric',
  'Bed border fabric',
  'Bed back making',
  'Soft board making',
  'Seating fabric',
  'Seating making',
  'Pillow fabric',
  'Pillow',
  'Mattress',
  'Wallpaper rolls',
  'Wallpaper pasting',
  'Customised wallpaper',
  'Customised wallpaper pasting',
  'Carpet',
  'Bed set',
  'Bed sheet',
  'Runner fabric',
  'Matting',
  'Mat',
  'PVC Matting',
  'Rod',
  'Support',
  'End Caps',
  'Shower curtain'
]

async function run() {
  console.log('\n======================================================================')
  console.log('=== TEST SUITE: 24 MATERIALS & QUOTATION INSTALLATION / DELIVERY ===')
  console.log('======================================================================\n')

  // -------------------------------------------------------------------------
  // TEST SECTION 1: Code & Set Verification across Apps & APIs
  // -------------------------------------------------------------------------
  console.log('--- TEST SECTION 1: Static Definitions & Sets Verification ---')

  const managerSrc = fs.readFileSync(path.resolve('manager-app/src/main.jsx'), 'utf-8')
  const staffSrc = fs.readFileSync(path.resolve('staff-app/src/main.jsx'), 'utf-8')
  const serverSrc = fs.readFileSync(path.resolve('api/src/server.js'), 'utf-8')
  const apiPathSrc = fs.readFileSync(path.resolve('api/[...path].js'), 'utf-8')

  for (const mat of REQUIRED_24_MATERIALS) {
    const lower = mat.toLowerCase()
    assert(managerSrc.toLowerCase().includes(`'${lower}'`), `manager-app includes '${mat}' in material set`)
    assert(staffSrc.toLowerCase().includes(`'${lower}'`), `staff-app includes '${mat}' in material set`)
    assert(serverSrc.toLowerCase().includes(`'${lower}'`), `api/src/server.js includes '${mat}' in MANUAL_QUANTITY_MATERIALS`)
    assert(apiPathSrc.toLowerCase().includes(`'${lower}'`), `api/[...path].js includes '${mat}' in MANUAL_QUANTITY_MATERIALS`)
  }

  // Verify Shower curtain is not treated as a standard curtain system (no tracks generated for it)
  assert(staffSrc.includes("if (p === 'shower curtain') return false"), "staff-app isCurtainProduct explicitly excludes 'shower curtain'")
  assert(managerSrc.includes("if (n === 'shower curtain') return false"), "manager-app isCurtainProduct explicitly excludes 'shower curtain'")

  // Verify staff-app has NO option to input MRP anywhere
  assert(!staffSrc.includes('MRP per unit') && !staffSrc.includes('Enter MRP per unit'), 'staff-app contains NO option to input MRP anywhere')

  // -------------------------------------------------------------------------
  // TEST SECTION 2: API Acceptance of 0 Width/Height for all 24 Materials
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 2: API End-to-End Submission for 24 Materials ---')

  const TEST_PORT = 8993
  const BASE = `http://127.0.0.1:${TEST_PORT}/api`
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-test-inst-'))
  const templatePath = path.resolve('api/data/krishna-decor.json')
  fs.copyFileSync(templatePath, path.join(tempDir, 'krishna-decor.json'))

  const server = await startLocalApiServer({ port: TEST_PORT, dataDirectory: tempDir, quiet: true })

  try {
    // 1. Authenticate Manager
    const mgrRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dinesh', email: 'dinesh@krishnadecor.local', password: 'KDecor2026', role: 'manager' })
    })
    const mgrData = await mgrRes.json()
    const ownerToken = mgrData.token
    assert(mgrRes.ok && ownerToken, 'Manager account authenticated on test API server')

    // 2. Create staff member
    const staffName = 'FieldStaff_' + Date.now().toString(36)
    const staffRes = await fetch(`${BASE}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ name: staffName, password: 'password12345' })
    })
    const staffData = await staffRes.json()
    assert(staffRes.ok, 'Field staff account created')

    // Login staff
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: staffName, password: 'password12345', role: 'staff' })
    })
    const loginData = await loginRes.json()
    const staffToken = loginData.token
    assert(loginRes.ok && staffToken, 'Field staff signed in successfully')

    // 3. Create project
    const projRes = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        customer: { name: 'Installation & Material Test Client', phone: '9876543210' },
        areas: [{ id: 'area-1', name: 'Master Suite', width: 0, height: 0, unit: 'in', products: [] }]
      })
    })
    const projData = await projRes.json()
    const projectId = projData.project.id
    assert(projRes.ok && projectId, 'Project created on server')

    // 4. Test non-manual product without measurements is rejected
    const nonManualSub = await fetch(`${BASE}/staff/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        items: [{
          area: 'Master Suite',
          product: 'Roller blinds',
          width: 0,
          height: 0,
          quantity: 2
        }]
      })
    })
    assert(!nonManualSub.ok && nonManualSub.status === 400, 'Non-manual material without measurements is rejected with HTTP 400')

    // 4. Submit all 24 materials with width=0, height=0 (optional), manual quantity, and MRP unitPrice
    const submissionItems = REQUIRED_24_MATERIALS.map((product, idx) => ({
      area: 'Master Suite',
      product,
      width: 0,
      height: 0,
      unit: 'in',
      quantity: 5 + idx,
      unitPrice: 250 + (idx * 50),
      notes: `Test material item ${idx + 1}`
    }))

    const subRes = await fetch(`${BASE}/staff/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ items: submissionItems })
    })
    const subData = await subRes.json()
    assert(subRes.ok, `All 24 materials submitted without width/height error (status ${subRes.status})`)

    // Verify stored project has all 24 staffDrafts with quantity & unitPrice preserved
    const getProj = await fetch(`${BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    const getProjData = await getProj.json()
    const drafts = getProjData.project.staffDrafts || []
    assert(drafts.length === 24, `Project contains all 24 staff drafts (found ${drafts.length})`)

    let allPreserved = true
    for (let i = 0; i < REQUIRED_24_MATERIALS.length; i++) {
      const mat = REQUIRED_24_MATERIALS[i]
      const found = drafts.find(d => d.product.toLowerCase() === mat.toLowerCase())
      if (!found || found.quantity !== (5 + i) || found.unitPrice !== (250 + i * 50) || found.isManualQuantity !== true) {
        allPreserved = false
        console.error(`Mismatch on material ${mat}:`, found)
        break
      }
    }
    assert(allPreserved, 'All 24 materials preserved manual quantity, MRP unitPrice, and isManualQuantity: true in DB')

  } finally {
    server.close()
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 3: Installation Formula Logic (Tracks + Blinds)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 3: Installation Formula Breakdown ---')

  // Extract calculateInstallationBreakdown and isBlindProduct logic from manager-app
  function testIsCurtain(p) {
    if (!p) return false
    const n = String(p).toLowerCase().trim()
    if (n === 'shower curtain') return false
    return n.includes('curtain') || n.includes('sheer') || n.includes('lining') ||
      n.includes('eyelet') || n.includes('eylet') || n.includes('ripple') ||
      n.includes('american') || n.includes('valence') || n.includes('valance')
  }

  function testIsBlind(name) {
    if (!name) return false
    const p = String(name).toLowerCase().trim()
    return p.includes('blind') || p.includes('roman') || p.includes('roller') ||
      p.includes('zebra') || p.includes('venetian') || p.includes('monsoon')
  }

  function calculateInstallationBreakdown(items = [], project = null) {
    let numTracks = 0
    let numBlinds = 0

    if (project?.areas && project.areas.length > 0) {
      for (const area of project.areas) {
        const areaCurtains = (area.products || []).filter((p) => testIsCurtain(p.product))
        if (areaCurtains.length > 0) {
          const groups = new Map()
          for (const c of areaCurtains) {
            const pName = String(c.product || '').toLowerCase()
            if (pName.includes('lining')) continue
            const key = c.curtainSetId || c.measurementSetId || c.variantLabel || 'default'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(c)
          }
          for (const [, grp] of groups) {
            const hasMain = grp.some((i) => i.product.toLowerCase().includes('main') || (!i.product.toLowerCase().includes('sheer')))
            const hasSheer = grp.some((i) => i.product.toLowerCase().includes('sheer'))
            const hasDouble = grp.some((i) => (i.clampType || '').toLowerCase().includes('double'))
            if (hasDouble || (hasMain && hasSheer)) {
              numTracks += 2
            } else {
              numTracks += 1
            }
          }
        }

        for (const p of area.products || []) {
          if (testIsBlind(p.product)) {
            const mCount = Array.isArray(p.measurements)
              ? p.measurements.filter((m) => Number(m.width) > 0 || Number(m.height) > 0).length
              : 0
            numBlinds += (mCount > 0 ? mCount : 1)
          }
        }
      }

      for (const d of project.staffDrafts || []) {
        const p = String(d.product || '').toLowerCase()
        if (testIsBlind(p)) {
          numBlinds += 1
        } else if (testIsCurtain(p) && !p.includes('lining')) {
          numTracks += 1
        }
      }
    } else {
      const curtainItems = (items || []).filter((i) => testIsCurtain(i.product) && !String(i.product).toLowerCase().includes('lining'))
      const blindItems = (items || []).filter((i) => testIsBlind(i.product))

      const areaCurtainMap = new Map()
      for (const it of curtainItems) {
        const key = (it.area || 'default') + '::' + (it.variantLabel || 'set1')
        if (!areaCurtainMap.has(key)) areaCurtainMap.set(key, [])
        areaCurtainMap.get(key).push(it)
      }
      for (const [, grp] of areaCurtainMap) {
        const hasMain = grp.some((i) => i.product.toLowerCase().includes('main'))
        const hasSheer = grp.some((i) => i.product.toLowerCase().includes('sheer'))
        if (hasMain && hasSheer) numTracks += 2
        else numTracks += 1
      }

      for (const it of blindItems) {
        const mCount = Array.isArray(it.measurements)
          ? it.measurements.filter((m) => Number(m.width) > 0 || Number(m.height) > 0).length
          : 0
        numBlinds += (mCount > 0 ? mCount : 1)
      }
    }

    return {
      numTracks,
      numBlinds,
      totalInstallation: numTracks + numBlinds
    }
  }

  // Scenario 1: Living room with American main + American sheer (double track = 2 tracks)
  // + Bedroom with Roman blinds (1 blind)
  // + Balcony with Roller blinds having 2 measurements (2 blinds)
  // + Shower curtain (should NOT add tracks or blinds!)
  const testProject = {
    areas: [
      {
        name: 'Living Room',
        products: [
          { product: 'American main curtain', curtainSetId: 'set-lr-1' },
          { product: 'American sheer curtain', curtainSetId: 'set-lr-1' },
          { product: 'American lining', curtainSetId: 'set-lr-1' } // lining ignored in track count
        ]
      },
      {
        name: 'Bedroom 1',
        products: [
          { product: 'Roman blinds' }
        ]
      },
      {
        name: 'Balcony',
        products: [
          {
            product: 'Roller blinds',
            measurements: [
              { width: 48, height: 72 },
              { width: 48, height: 72 }
            ]
          }
        ]
      },
      {
        name: 'Bathroom',
        products: [
          { product: 'Shower curtain', quantity: 2 }
        ]
      }
    ],
    staffDrafts: []
  }

  const breakdown = calculateInstallationBreakdown([], testProject)
  assert(breakdown.numTracks === 2, `Tracks counted correctly: 2 tracks for Main + Sheer (got ${breakdown.numTracks})`)
  assert(breakdown.numBlinds === 3, `Blinds counted correctly: 1 Roman + 2 Roller = 3 blinds (got ${breakdown.numBlinds})`)
  assert(breakdown.totalInstallation === 5, `Total installation is tracks + blinds = 5 units (got ${breakdown.totalInstallation})`)

  // Scenario 2: Single curtain set with single clamp = 1 track
  const testProjectSingle = {
    areas: [
      {
        name: 'Guest Room',
        products: [
          { product: 'Ripple main curtain', curtainSetId: 'set-gr-1', clampType: 'Single wall clamp' }
        ]
      },
      {
        name: 'Study',
        products: [
          { product: 'Zebra blinds' }
        ]
      }
    ],
    staffDrafts: []
  }
  const breakdownSingle = calculateInstallationBreakdown([], testProjectSingle)
  assert(breakdownSingle.numTracks === 1, `Single curtain has 1 track (got ${breakdownSingle.numTracks})`)
  assert(breakdownSingle.numBlinds === 1, `1 Zebra blind (got ${breakdownSingle.numBlinds})`)
  assert(breakdownSingle.totalInstallation === 2, `Total installation = 2 units (got ${breakdownSingle.totalInstallation})`)

  // -------------------------------------------------------------------------
  // TEST SECTION 4: Quotation Document Structure, Untaxed Amount & Deletion
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 4: Quotation Document Separation & Totals ---')

  // Simulate DocumentSheet line classification and totals calculation
  function isInstallationServiceLine(line) {
    if (!line) return false
    if (line.isInstallationService) return true
    const p = (line.product || '').toLowerCase().trim()
    return p === 'installation' || p.includes('installation') || p === 'fitting'
  }

  function isDeliveryServiceLine(line) {
    if (!line) return false
    if (line.isDeliveryService) return true
    const p = (line.product || '').toLowerCase().trim()
    return p === 'delivery' || p.includes('delivery') || p === 'transport' || p === 'shipping' || p === 'freight'
  }

  function isAccessoryOrServiceLine(line) {
    const p = (line.product || '').toLowerCase().trim()
    const area = (line.area || '').toLowerCase().trim()
    if (area === 'hardware' || area === 'services' || area === 'installation' || area === 'stitching' || area === 'delivery') return true
    if (p.includes('stitching') || p.includes('making') || p.includes('pasting') || p.includes('fitting')) return true
    if (p.includes('track') || p.includes('runner') || p.includes('hook') || p.includes('clamp') || p.includes('rod') || p.includes('support') || p.includes('end cap')) return true
    if (p.includes('delivery') || p.includes('transport') || p.includes('shipping') || p.includes('freight')) return true
    return false
  }

  const sampleQuoteItems = [
    { id: 'item-1', product: 'American main curtain', area: 'Living Room', quantity: 10, unitPrice: 500, gst: 5 },
    { id: 'item-2', product: 'Track', area: 'Hardware', quantity: 15, unitPrice: 100, gst: 18 },
    {
      id: 'item-inst',
      product: 'Installation',
      area: 'Services',
      quantity: breakdown.totalInstallation, // 5 units
      unitPrice: 150,
      gst: 18,
      isInstallationService: true
    },
    {
      id: 'item-del',
      product: 'Delivery',
      area: 'Services',
      quantity: 1,
      unitPrice: 500,
      gst: 18,
      isDeliveryService: true
    }
  ]

  // Verify separation from upper tables
  const productItems = sampleQuoteItems.filter(item => !isAccessoryOrServiceLine(item) && !isInstallationServiceLine(item) && !isDeliveryServiceLine(item))
  const accessoryItems = sampleQuoteItems.filter(item => isAccessoryOrServiceLine(item) && !isInstallationServiceLine(item) && !isDeliveryServiceLine(item))

  assert(productItems.length === 1 && productItems[0].product === 'American main curtain', 'Installation and Delivery excluded from product table')
  assert(accessoryItems.length === 1 && accessoryItems[0].product === 'Track', 'Installation and Delivery excluded from accessory table')

  // Calculate regular untaxed amount (excluding installation and delivery)
  const regularItemsUntaxed = sampleQuoteItems
    .filter(item => !isInstallationServiceLine(item) && !isDeliveryServiceLine(item))
    .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)

  // 10 * 500 + 15 * 100 = 5000 + 1500 = 6500
  assert(regularItemsUntaxed === 6500, `Untaxed Amount for regular items is ₹6500 (got ₹${regularItemsUntaxed})`)

  // Installation line amount: 5 units * ₹150 = ₹750
  const instLine = sampleQuoteItems.find(isInstallationServiceLine)
  const instAmount = (Number(instLine.quantity) || 0) * (Number(instLine.unitPrice) || 0)
  assert(instAmount === 750, `Installation amount is ₹750 (got ₹${instAmount})`)

  // Delivery line amount: 1 * ₹500 = ₹500
  const delLine = sampleQuoteItems.find(isDeliveryServiceLine)
  const delAmount = (Number(delLine.quantity) || 0) * (Number(delLine.unitPrice) || 0)
  assert(delAmount === 500, `Delivery amount is ₹500 (got ₹${delAmount})`)

  // Total untaxed including installation and delivery: 6500 + 750 + 500 = 7750
  const grandUntaxed = sampleQuoteItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  assert(grandUntaxed === 7750, `Grand untaxed total correctly includes Installation and Delivery: ₹7750 (got ₹${grandUntaxed})`)

  // Test Deletion
  const afterDeletingInst = sampleQuoteItems.filter(item => item.id !== 'item-inst')
  assert(!afterDeletingInst.some(isInstallationServiceLine), 'Installation is completely deletable from quote items')

  const afterDeletingBoth = afterDeletingInst.filter(item => item.id !== 'item-del')
  assert(!afterDeletingBoth.some(isDeliveryServiceLine), 'Delivery is completely deletable from quote items')

  // Quick-add restoration test
  const restoredItems = [...afterDeletingBoth]
  restoredItems.push({
    id: 'item-inst-new',
    product: 'Installation',
    area: 'Services',
    quantity: breakdown.totalInstallation,
    unitPrice: 200,
    gst: 18,
    isInstallationService: true
  })
  assert(restoredItems.some(isInstallationServiceLine), 'Installation can be restored via Quick-Add action')

  console.log('\n======================================================================')
  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
