const { BrowserWindow, dialog, shell } = require('electron')
const { createHash } = require('node:crypto')
const { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, renameSync, unlinkSync } = require('node:fs')
const { basename, dirname, join, resolve } = require('node:path')
const { tmpdir } = require('node:os')
const { pathToFileURL } = require('node:url')

function computeHash(content) {
  return createHash('sha256').update(String(content || '')).digest('hex')
}

/**
 * Sanitizes a folder or file name for Windows filesystem.
 * Strips invalid characters: < > : " / \ | ? * and control chars.
 */
function sanitizeName(name, fallback = 'Unnamed') {
  const clean = String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
  return clean || String(fallback || 'Unnamed').trim()
}

/**
 * Formats currency in Indian Rupee format (e.g. ₹1,23,456.00)
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatQuantity(qty) {
  const n = Number(qty) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function unitLabel(productName) {
  const p = String(productName || '').toLowerCase().trim()
  if (
    p === 'american stitching' ||
    p === 'valence stitching' ||
    p === 'velance stitching' ||
    p === 'valance stitching' ||
    p === 'eyelet stitching' ||
    p === 'ripple stitching' ||
    (p.includes('stitching') && (p.includes('american') || p.includes('valence') || p.includes('velance') || p.includes('valance') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple')))
  ) {
    return 'panels'
  }
  if (p === 'wallpaper rolls' || p.includes('wallpaper roll') || p.includes('rolls')) {
    return 'rolls'
  }
  if (p === 'rod' || p === 'track' || p === 'tracks') {
    return 'ft'
  }
  if (p === 'carpet' || p === 'matting' || p === 'pvc matting' || p.includes('blind') || p.includes('roman') || p.includes('roller') || p.includes('zebra') || p.includes('venetian') || p.includes('wallpaper')) {
    return 'sq ft'
  }
  if (p === 'shower curtain') {
    return 'pcs'
  }
  if (p.includes('fabric') || (p.includes('curtain') && p !== 'shower curtain') || p.includes('sheer') || p.includes('lining') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple') || p.includes('american') || p.includes('valance') || p.includes('valence')) {
    return 'm'
  }
  if (p.includes('stitching') || p.includes('hook') || p.includes('clamp') || p.includes('runner') || p.includes('end cap') || p.includes('support') || p.includes('pillow') || p.includes('mattress') || p.includes('bed set') || p.includes('bedsheet') || p.includes('bed sheet') || p.includes('bed back making') || p.includes('soft board making') || p.includes('seating making') || p === 'mat') {
    return 'pcs'
  }
  return 'units'
}

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

/**
 * Computes quotation or invoice totals (untaxed, tax, total)
 */
function computeTotals(items = []) {
  const regularItems = items.filter(it => !isDiscountLine(it))
  const regularUntaxed = regularItems
    .filter(it => !isInstallationService(it) && !isDeliveryService(it))
    .reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)

  let untaxed = 0
  let tax = 0
  for (const it of regularItems) {
    if (!it) continue
    const q = Number(it.quantity) || 0
    const p = Number(it.unitPrice) || 0
    const lineTotal = q * p
    untaxed += lineTotal
    const gstRate = (it.gst !== undefined && it.gst !== null) ? Number(it.gst) : 18
    tax += (lineTotal * gstRate) / 100
  }

  const discountLine = items.find(it => isDiscountLine(it))
  const rawDiscount = Number(discountLine?.unitPrice) || 0
  const discount = Math.min(Math.max(0, rawDiscount), regularUntaxed)
  const total = Math.max(0, untaxed + tax - discount)

  return {
    untaxed: Math.round(untaxed * 100) / 100,
    regularUntaxed: Math.round(regularUntaxed * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    rawDiscount: Math.round(rawDiscount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  }
}

/**
 * Determines whether a line item belongs to accessories/hardware/services table
 */
function isAccessoryOrService(line) {
  if (!line || isDiscountLine(line)) return false
  if (line.isAutoHardware) return true
  const area = String(line.area || '').toLowerCase().trim()
  if (['hardware', 'services', 'installation', 'stitching', 'delivery'].includes(area)) return true
  const p = String(line.product || '').toLowerCase().trim()
  if (p === 'track' || p === 'tracks' || p.includes('track') || p.includes('rod')) return true
  if (p === 'runners' || p === 'runner' || (p.includes('runner') && !p.includes('fabric'))) return true
  if (p === 'hooks' || p === 'hook' || p.includes('hook')) return true
  if (p.includes('clamp')) return true
  if (
    p === 'american stitching' ||
    p === 'valence stitching' ||
    p === 'velance stitching' ||
    p === 'valance stitching' ||
    p === 'eyelet stitching' ||
    p === 'ripple stitching' ||
    p.includes('stitching') ||
    p.includes('making')
  ) return true
  if (p.includes('installation') || p.includes('fitting')) return true
  if (p.includes('delivery') || p.includes('transport') || p.includes('shipping') || p.includes('freight')) return true
  return false
}

/**
 * Clean product name for quotation draft and invoice display
 */
function cleanProductName(name) {
  if (!name) return ''
  return String(name)
    .replace(/\s*[-–—:]?\s*Measurement\s*\d+.*$/i, '')
    .replace(/\s*\(Measurement\s*\d+.*?\)/gi, '')
    .replace(/\s*[-–—:]?\s*⌈.*$/i, '')
    .replace(/\s*[-–—:]?\s*Formula:.*$/i, '')
    .replace(/\s*[-–—:]?\s*(?:Note|Notes|Spec|Specs|Specification|Specifications):.*$/i, '')
    .replace(/\s*\((?:Note|Notes|Spec|Specs|Specification|Specifications).*?\)/gi, '')
    .replace(/\s*[-–—:]?\s*\d+\s*(?:panels|drops|running ft|sq ft|fabric|mtr|m\b).*$/i, '')
    .trim() || name
}

let cachedBgDataUri = null
function getDocumentBackgroundDataUri() {
  if (cachedBgDataUri) return cachedBgDataUri
  const candidates = [
    resolve(__dirname, 'document-bg.jpg'),
    resolve(__dirname, '../../manager-app/src/assets/document-bg.jpg'),
    resolve(process.cwd(), 'desktop-manager/src/document-bg.jpg'),
    resolve(process.cwd(), 'manager-app/src/assets/document-bg.jpg')
  ]
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        const buf = readFileSync(c)
        cachedBgDataUri = `data:image/jpeg;base64,${buf.toString('base64')}`
        return cachedBgDataUri
      } catch {}
    }
  }
  return ''
}

function cleanNonPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return
  try {
    const files = readdirSync(dir)
    for (const f of files) {
      if (!f.endsWith('.pdf')) {
        try { unlinkSync(join(dir, f)) } catch {}
      }
    }
  } catch {}
}

/**
 * Generate a standalone, printable, beautifully styled HTML document for Quotations or Invoices
 * exactly in the application format with the background image embedded.
 */
function generateDocumentHtml(project, quote, isInvoice = false, documentNumber = null) {
  const items = quote.items || []
  const totals = computeTotals(items)
  const docType = isInvoice ? 'Tax Invoice' : 'Quotation'
  const docNum = documentNumber || (isInvoice
    ? (quote.id.startsWith('KD') ? quote.id : 'KD-' + quote.id.replace(/^INV-?/, ''))
    : quote.id)

  const customerName = project?.customer?.name || 'Customer'
  const projectName = project?.name || 'Project'
  const quoteDate = quote?.date || new Date().toISOString().slice(0, 10)
  const draftTitle = quote?.title || 'Draft'

  const productItems = items.filter(it => !isAccessoryOrService(it) && !isInstallationService(it) && !isDeliveryService(it) && !isDiscountLine(it))
  const accessoryItems = items.filter(it => isAccessoryOrService(it) && !isInstallationService(it) && !isDeliveryService(it) && !isDiscountLine(it))
  const installationLine = items.find(it => isInstallationService(it))
  const deliveryLine = items.find(it => isDeliveryService(it))
  const bgDataUri = getDocumentBackgroundDataUri()

  function renderTableRows(list, isSecondary = false) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="5" style="text-align:center;padding:14px;color:#7a706b;">${isSecondary ? 'No hardware or service items.' : 'No product items in this document.'}</td></tr>`
    }
    return list.map(item => {
      const pName = cleanProductName(item.product)
      const showArea = item.area && item.area !== 'Hardware' && (!isSecondary || item.area !== 'Services')
      const displayDesc = (showArea && !isInvoice ? `${escapeHtml(item.area)} - ` : '') + escapeHtml(pName)
      const qty = Number(item.quantity) || 0
      const unit = unitLabel(item.product)
      const price = Number(item.unitPrice) || 0
      const gst = (item.gst !== undefined && item.gst !== null) ? Number(item.gst) : 18
      const amount = qty * price
      const note = ''

      return `<tr>
        <td>
          <strong>${displayDesc}</strong>
          ${note}
        </td>
        <td style="text-align:right;white-space:nowrap;font-family:'DM Mono',monospace;"><span>${formatQuantity(qty)} ${unit}</span></td>
        <td style="text-align:right;white-space:nowrap;font-family:'DM Mono',monospace;"><span>${formatCurrency(price)}</span></td>
        <td style="text-align:right;white-space:nowrap;"><span>GST ${gst}%</span></td>
        <td style="text-align:right;white-space:nowrap;background:rgba(246,243,240,.7);font-weight:600;font-family:'DM Mono',monospace;"><strong>${formatCurrency(amount)}</strong></td>
      </tr>`
    }).join('')
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(docType)} #${escapeHtml(docNum)} - ${escapeHtml(projectName)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #faf7f2;
      color: #1f1b18;
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .document-sheet {
      --document-ink: #1f1b18;
      --document-grid: #c9b8ab;
      --document-mauve: #c8b8ad;
      --document-red: #7a2128;
      --document-blush: #fbf7f4;
      position: relative;
      isolation: isolate;
      width: 100%;
      max-width: 920px;
      min-height: 1300px;
      margin: 0 auto;
      overflow: hidden;
      padding: 0;
      border: 1px solid #d5cec5;
      border-radius: 8px;
      background-color: #faf7f2;
      background-image: url('${bgDataUri}');
      background-size: 100% 1300px;
      background-repeat: repeat-y;
      background-position: top center;
      color: var(--document-ink);
      box-shadow: 0 18px 48px rgba(20,32,51,.12);
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .document-sheet>* { position: relative; z-index: 1; }
    .document-page-bg { display: none; }
    .document-header { display: grid; grid-template-columns: 1fr minmax(280px, auto); align-items: start; gap: 24px; padding: 38px 48px 18px 58px; }
    .document-company h2 { margin: 0 0 2px; color: var(--document-red); font: 700 30px/1.1 Georgia, "Playfair Display", serif; letter-spacing: -.02em; }
    .document-tagline { display: block; margin: 0 0 12px; color: #ab5846; font-size: 9.5px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
    .document-company p { margin: 0; color: #38312d; font-size: 12.5px; line-height: 1.55; }
    .document-company p strong { font-weight: 700; }
    .document-company .document-customer { margin-top: 14px; font-size: 13px; line-height: 1.4; }
    .document-company .document-customer .customer-name { font-size: 15px; color: #172033; }
    .document-customer span { color: #5c524c; font-size: 12px; }
    .document-title { display: grid; justify-items: end; text-align: right; padding-top: 130px; }
    .document-title h1,
    .document-title-badge { display: inline-flex; align-items: baseline; gap: 7px; margin: 0; padding: 6px 14px; background: rgba(255,253,250,.94); backdrop-filter: blur(4px); border: 1px solid rgba(160,115,85,.45); border-radius: 8px; box-shadow: 0 2px 10px rgba(90,45,24,.09); color: #5a2d18 !important; font: 700 23px/1.2 Georgia, "DM Serif Display", serif; letter-spacing: -.02em; white-space: nowrap; }
    .document-title h1 .doc-type-name { color: #5a2d18; }
    .document-title h1 .doc-hash { font-weight: 400; color: #8c5d42; }
    .document-title h1 .doc-number-val { color: #5a2d18; font-weight: 700; }
    .document-draft-tag { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; background: rgba(122,33,40,.1); color: var(--document-red); font-size: 11px; font-weight: 600; }
    .document-title p { margin: 6px 0 0; color: #2b2522; font-size: 12.5px; font-weight: 700; letter-spacing: .04em; }
    .document-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin: 0 46px 20px 58px; border: 1px solid #c9b8ab; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,.88); backdrop-filter: blur(2px); }
    .document-details>div { display: grid; gap: 4px; min-height: 60px; padding: 10px 14px; border-right: 1px solid rgba(201,184,171,.4); }
    .document-details>div:last-child { border-right: 0; }
    .document-details strong { color: #7a584e; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
    .document-details span { color: var(--document-ink); font-size: 14px; font-weight: 600; }
    .document-table-shell { margin: 0 46px 0 58px; overflow-x: auto; border: 1px solid #c9b8ab; border-radius: 10px; background: rgba(255,255,255,.92); backdrop-filter: blur(2px); }
    .document-table-shell.secondary-table-shell { margin: 10px 46px 0 58px; border-radius: 8px; background: rgba(255,255,255,.94); overflow: hidden; }
    .document-table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; color: var(--document-ink); }
    .document-table th { padding: 11px 12px; border-right: 1px solid rgba(255,255,255,.6); background: var(--document-mauve); color: #2a1f1b; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .document-table th:first-child { width: 44%; padding-left: 14px; }
    .document-table th:nth-child(2) { width: 16%; text-align: right; }
    .document-table th:nth-child(3) { width: 15%; text-align: right; }
    .document-table th:nth-child(4) { width: 11%; text-align: right; }
    .document-table th:last-child { width: 14%; border-right: 0; text-align: right; padding-right: 14px; }
    .document-table td { padding: 11px 12px; border-top: 1px solid rgba(201,184,171,.45); border-right: 1px solid rgba(201,184,171,.3); vertical-align: middle; color: #2a2320; font-size: 13.5px; }
    .document-table td:first-child { padding-left: 14px; }
    .document-table td:nth-child(n+2) { text-align: right; white-space: nowrap; }
    .document-table td:last-child { border-right: 0; background: rgba(246,243,240,.7); padding-right: 14px; }
    .document-table td strong { color: #171f30; font-size: 13.5px; font-weight: 600; }
    .document-table.secondary th { padding: 7px 12px; background: #d4c6be; font-size: 10.5px; letter-spacing: .03em; }
    .invoice-sheet .document-table.secondary th { background: #cbdcf2; color: #102647; }
    .document-table.secondary td { padding: 6px 12px; font-size: 12px; line-height: 1.35; }
    .document-table.secondary td:first-child { padding-left: 14px; }
    .document-summary { display: grid; grid-template-columns: minmax(0, 1fr) 44%; gap: 28px; padding: 22px 46px 26px 58px; align-items: end; }
    .document-terms { background: rgba(255,255,255,.85); border: 1px solid rgba(201,184,171,.5); border-radius: 8px; padding: 12px 16px; }
    .document-terms h3 { margin: 0 0 6px; color: #7a584e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .document-terms ol { margin: 0; padding-left: 18px; color: #38312d; font-size: 11px; line-height: 1.55; }
    .document-totals { overflow: hidden; border: 1px solid #c9b8ab; border-radius: 10px; background: rgba(255,255,255,.92); backdrop-filter: blur(2px); }
    .document-totals .total-line { display: grid; grid-template-columns: 1fr auto; gap: 15px; padding: 9px 12px; border-bottom: 1px solid rgba(201,184,171,.45); color: #3b322e; font-size: 13.5px; }
    .document-totals .total-line strong { color: #171f30; font: 600 13.5px "DM Sans", Arial, sans-serif; }
    .document-totals .total-line.total { margin: 0; padding: 12px; border: 0; background: #a89488; color: #ffffff; font-size: 15px; }
    .document-totals .total-line.total strong { color: #ffffff; font: 700 16px "DM Sans", Arial, sans-serif; }
    .service-total-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 9px 12px;
      border-bottom: 1px solid rgba(201,184,171,.45);
      background: rgba(250,248,245,.65);
    }
    .service-total-header { display: flex; align-items: center; }
    .service-name-wrap strong { font-size: 13px; color: #171f30; font-weight: 700; }
    .service-calculation-line { margin: 0; display: flex; align-items: center; justify-content: flex-end; }
    .service-amount-val { font: 600 13.5px "DM Sans", Arial, sans-serif; color: #171f30; margin: 0; white-space: nowrap; }
    .discount-val { color: #b91c1c !important; }
    .document-footer { display: grid; grid-template-columns: 1fr 1.35fr; gap: 35px; align-items: stretch; padding: 20px 46px 36px 58px; border-top: 1px solid rgba(201,184,171,.45); }
    .document-bank { display: grid; gap: 4px; text-align: left; background: rgba(255,255,255,.85); border: 1px solid rgba(201,184,171,.5); border-radius: 8px; padding: 10px 14px; }
    .document-bank p { margin: 0; color: #7a584e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .document-bank strong { font-size: 12.5px; color: #1f1b18; }
    .document-bank span { color: #3b322e; font-size: 11px; line-height: 1.5; }
    .document-signature { display: grid; min-height: 95px; align-content: space-between; text-align: left; background: rgba(255,255,255,.85); border: 1px solid rgba(201,184,171,.5); border-radius: 8px; padding: 10px 14px; }
    .document-signature p { margin: 0; color: #3b322e; font-size: 11.5px; line-height: 1.45; }
    .document-signature span { justify-self: end; min-width: 195px; padding-top: 28px; border-bottom: 1px solid #3b322e; color: #1f1b18; font-size: 12.5px; font-weight: 600; text-align: center; }
    .invoice-sheet { --document-red: #173e73; }
    .invoice-sheet .document-company h2 { color: #173e73; }
    .invoice-sheet .document-details strong { color: #173e73; }
    .invoice-sheet .document-totals .total-line.total { background: #173e73; color: #ffffff; }
    .invoice-sheet .document-table td small { display: none !important; }

    @media print {
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .document-sheet {
        max-width: none !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 100vh !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background-color: transparent !important;
        background-image: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .document-page-bg {
        display: block !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: -10 !important;
        background-image: url('${bgDataUri}') !important;
        background-size: 100% 100% !important;
        background-repeat: no-repeat !important;
        background-position: center top !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        pointer-events: none !important;
      }
      .document-table { min-width: 0 !important; }
      .document-table thead { display: table-header-group !important; }
      .document-table tr { break-inside: avoid !important; page-break-inside: avoid !important; }
      .document-summary, .document-totals, .document-footer { break-inside: avoid !important; page-break-inside: avoid !important; }
      .document-table th, .document-table td:last-child, .document-totals .total-line.total, .document-table.secondary th, .document-title-badge, .document-title h1 { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .document-title-badge, .document-title h1 { background: rgba(255,253,250,.95) !important; color: #5a2d18 !important; }
      .document-table-shell.secondary-table-shell { margin: 10px 46px 0 58px !important; border-radius: 8px !important; break-inside: avoid !important; page-break-inside: avoid !important; }
    }
  </style>
</head>
<body>
  <article class="quotation-sheet document-sheet${isInvoice ? ' invoice-sheet' : ''}">
    <div class="document-page-bg" aria-hidden="true"></div>
    <header class="document-header">
      <div class="document-company">
        <h2>Krishna Decor</h2>
        <span class="document-tagline">SPACES DRESSED BEAUTIFULLY</span>
        <p>CTS NO - 1813|2B|2<br>Bapat Galli Car Parking<br><strong>Belgaum-Karnataka</strong><br>Mob - 9036674138<br>E-mail - krishna.decor2015@gmail.com</p>
        <p class="document-customer"><strong>To:</strong> <strong class="customer-name">${escapeHtml(customerName)}</strong><br><span>${escapeHtml(projectName)}</span></p>
      </div>
      <div class="document-title">
        <h1 class="document-title-badge">
          <span class="doc-type-name">${escapeHtml(docType)}</span>
          <span class="doc-hash">#</span>
          <span class="doc-number-val">${escapeHtml(docNum)}</span>
        </h1>
        ${!isInvoice && draftTitle ? `<span class="document-draft-tag">${escapeHtml(draftTitle)}</span>` : ''}
        <p>GSTIN: 29AWZPK1722G1Z4</p>
      </div>
    </header>

    <section class="document-details" aria-label="${escapeHtml(docType)} details">
      <div><strong>${isInvoice ? 'Invoice Date' : 'Quotation Date'}</strong><span>${escapeHtml(quoteDate)}</span></div>
      <div><strong>${isInvoice ? 'Payment Terms' : 'Expiration'}</strong><span>${isInvoice ? 'As agreed' : 'Valid for 30 days'}</span></div>
      <div><strong>${isInvoice ? 'Billing To' : 'Salesperson'}</strong><span>${escapeHtml(isInvoice ? customerName : 'Krishna Decor')}</span></div>
    </section>

    <!-- TABLE 1: MAIN PRODUCTS -->
    <div class="document-table-shell">
      <table class="document-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="width:16%;text-align:right;">Quantity</th>
            <th style="width:15%;text-align:right;">Unit Price</th>
            <th style="width:11%;text-align:right;">Taxes</th>
            <th style="width:14%;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows(productItems, false)}
        </tbody>
      </table>
    </div>

    <!-- TABLE 2: ACCESSORIES, HARDWARE, STITCHING -->
    ${accessoryItems.length > 0 ? `
    <div class="document-table-shell secondary-table-shell">
      <table class="document-table secondary">
        <thead>
          <tr>
            <th>Description</th>
            <th style="width:16%;text-align:right;">Quantity</th>
            <th style="width:15%;text-align:right;">Unit Price</th>
            <th style="width:11%;text-align:right;">Taxes</th>
            <th style="width:14%;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows(accessoryItems, true)}
        </tbody>
      </table>
    </div>` : ''}

    <div class="document-summary">
      <section class="document-terms">
        <h3>Terms and conditions</h3>
        <ol>
          <li>NO CREDIT</li>
          <li>70% advance payment</li>
          <li>30% balance payment BEFORE DELIVERY</li>
          <li>Minimum delivery time is 20 days.</li>
          <li>Early delivery is not a commitment or guarantee.</li>
          <li>Scaffolding, ladder and stools required for installation must be provided by the customer.</li>
        </ol>
      </section>

      <section class="document-totals">
        <div class="total-line">
          <span>Untaxed Amount</span>
          <strong>${formatCurrency(totals.regularUntaxed !== undefined ? totals.regularUntaxed : totals.untaxed)}</strong>
        </div>

        ${totals.discount > 0 ? `
        <div class="service-total-row discount-total-row discount-row">
          <div class="service-total-header">
            <div class="service-name-wrap">
              <strong>Discount</strong>
            </div>
          </div>
          <div class="service-calculation-line">
            <strong class="service-amount-val discount-val" style="color:#b91c1c;">-${formatCurrency(totals.discount)}</strong>
          </div>
        </div>` : ''}

        ${installationLine ? `
        <div class="service-total-row installation-service-row">
          <div class="service-total-header">
            <div class="service-name-wrap">
              <strong>Installation</strong>
            </div>
          </div>
          <div class="service-calculation-line">
            <strong class="service-amount-val">${formatCurrency((Number(installationLine.quantity) || 1) * (Number(installationLine.unitPrice) || 0))}</strong>
          </div>
        </div>` : ''}

        ${deliveryLine ? `
        <div class="service-total-row delivery-service-row">
          <div class="service-total-header">
            <div class="service-name-wrap">
              <strong>Delivery</strong>
            </div>
          </div>
          <div class="service-calculation-line">
            <strong class="service-amount-val">${formatCurrency((Number(deliveryLine.quantity) || 1) * (Number(deliveryLine.unitPrice) || 0))}</strong>
          </div>
        </div>` : ''}

        <div class="total-line">
          <span>SGST / UTGST</span>
          <strong>${formatCurrency(totals.tax / 2)}</strong>
        </div>
        <div class="total-line">
          <span>CGST</span>
          <strong>${formatCurrency(totals.tax / 2)}</strong>
        </div>
        <div class="total-line total">
          <span>Total</span>
          <strong>${formatCurrency(totals.total)}</strong>
        </div>
      </section>
    </div>

    <footer class="document-footer">
      <div class="document-bank">
        <p>Bank Details</p>
        <strong>KRISHNA DECOR</strong>
        <span>Ac No 917020002479616<br>Axis Bank IFSC CODE UTIB0002941<br>Kadolkar Galli Branch</span>
      </div>
      <div class="document-signature">
        <p>I accept the above ${escapeHtml(docType.toLowerCase())} with the terms and conditions.</p>
        <span>Customer Signature</span>
      </div>
    </footer>
  </article>
</body>
</html>`
}

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

class BackupService {
  constructor(options = {}) {
    this.readConfigFn = options.readConfigFn || options.readConfig || (() => ({}))
    this.writeConfigFn = options.writeConfigFn || options.writeConfig || (() => {})
    this.pdfQueue = []
    this.processingPdf = false
    this.renderCache = new Map()
    this.loadCache()
  }

  loadCache() {
    try {
      const dir = this.getBackupDirectory()
      if (!dir) return
      const cacheFile = join(dir, '.pdf-cache.json')
      if (existsSync(cacheFile)) {
        const parsed = JSON.parse(readFileSync(cacheFile, 'utf8'))
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            this.renderCache.set(k, v)
          }
        }
      }
    } catch {}
  }

  saveCache() {
    try {
      const dir = this.getBackupDirectory()
      if (!dir || !existsSync(dir)) return
      const cacheFile = join(dir, '.pdf-cache.json')
      const obj = Object.fromEntries(this.renderCache)
      writeFileSync(cacheFile, JSON.stringify(obj, null, 2), { mode: 0o600 })
    } catch {}
  }

  /**
   * Reads configured backupDirectory from hub-config.json.
   */
  getBackupDirectory() {
    const config = this.readConfigFn()
    const dir = config.backupDirectory
    if (dir && existsSync(dir)) return dir
    return ''
  }

  /**
   * Saves backupDirectory to hub-config.json and ensures folder exists.
   */
  setBackupDirectory(chosenPath) {
    if (!chosenPath) throw new Error('Path cannot be empty')
    // Ensure final folder is named backup_krishna_decor
    const finalDir = basename(chosenPath).toLowerCase() === 'backup_krishna_decor'
      ? chosenPath
      : join(chosenPath, 'backup_krishna_decor')

    mkdirSync(finalDir, { recursive: true })
    const config = this.readConfigFn()
    config.backupDirectory = finalDir
    this.writeConfigFn(config)
    return finalDir
  }

  /**
   * Prompts the user with a native Windows directory selector to choose
   * where the main "backup_krishna_decor" folder will be created.
   */
  async promptSelectBackupDirectory(parentWindow) {
    const result = await dialog.showOpenDialog(parentWindow || undefined, {
      title: "Select Location to Create 'backup_krishna_decor' Folder",
      message: "Please choose where the main 'backup_krishna_decor' folder should be created on your system.",
      buttonLabel: "Create backup_krishna_decor Here",
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const selectedPath = result.filePaths[0]
    const finalDir = this.setBackupDirectory(selectedPath)
    return { canceled: false, path: finalDir }
  }

  /**
   * Ensures that for a given project:
   * 1. <backup_krishna_decor>/<projectName> folder exists
   * 2. <backup_krishna_decor>/<projectName>/drafts folder exists
   * 3. <backup_krishna_decor>/<projectName>/invoice folder exists
   *
   * Also cleans up any non-PDF files in those subfolders.
   */
  ensureProjectFolders(project) {
    const backupDir = this.getBackupDirectory()
    if (!backupDir) return null

    const projFolderName = sanitizeName(project.name, project.id)
    const projectDir = join(backupDir, projFolderName)
    const draftsDir = join(projectDir, 'drafts')
    const invoiceDir = join(projectDir, 'invoice')

    this.handleProjectFolderRename(backupDir, project.id, projectDir)

    mkdirSync(draftsDir, { recursive: true })
    mkdirSync(invoiceDir, { recursive: true })

    cleanNonPdfFiles(draftsDir)
    cleanNonPdfFiles(invoiceDir)

    return { projectDir, draftsDir, invoiceDir }
  }

  /**
   * Check existing project folders to detect if this project ID was previously under another folder name
   */
  handleProjectFolderRename(backupDir, projectId, targetProjectDir) {
    try {
      if (existsSync(targetProjectDir)) return
      const entries = readdirSync(backupDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const candidateDir = join(backupDir, entry.name)
        const marker = join(candidateDir, '.project-meta.json')
        if (existsSync(marker)) {
          try {
            const data = JSON.parse(readFileSync(marker, 'utf8'))
            if (data.id === projectId && candidateDir !== targetProjectDir) {
              renameSync(candidateDir, targetProjectDir)
              try { unlinkSync(marker) } catch {}
              return
            }
          } catch {}
        }
      }
    } catch {}
  }

  /**
   * Saves all quotation drafts for a project into <backup_krishna_decor>/<projectName>/drafts/
   * Only .pdf format is saved.
   */
  async saveProjectDrafts(project, draftsDir) {
    cleanNonPdfFiles(draftsDir)
    const quotations = project.quotations || []
    const savedDrafts = []

    for (let i = 0; i < quotations.length; i++) {
      const quote = quotations[i]
      if (!quote || !quote.id) continue

      const titlePart = quote.title ? sanitizeName(quote.title) : `Draft-${i + 1}`
      const baseName = `${titlePart}-${sanitizeName(quote.id)}`
      const pdfPath = join(draftsDir, `${baseName}.pdf`)
      const htmlContent = generateDocumentHtml(project, quote, false, quote.id)
      const hash = computeHash(htmlContent)

      if (!existsSync(pdfPath) || this.renderCache.get(pdfPath) !== hash) {
        await this.renderHtmlToPdf(htmlContent, pdfPath)
        this.renderCache.set(pdfPath, hash)
        this.saveCache()
      }
      savedDrafts.push({ id: quote.id, title: quote.title, pdfPath })
    }

    return savedDrafts
  }

  /**
   * Saves the invoice for a project (from approved quotation) into <backup_krishna_decor>/<projectName>/invoice/
   * Only .pdf format is saved.
   */
  async saveProjectInvoice(project, invoiceDir) {
    cleanNonPdfFiles(invoiceDir)
    const approved = (project.quotations || []).find((q) => q && q.status === 'Approved')
    if (!approved) {
      return null
    }

    const invoiceNumber = approved.id.startsWith('KD') ? approved.id : 'KD-' + approved.id.replace(/^INV-?/, '')
    const baseName = sanitizeName(`Tax-Invoice-${invoiceNumber}`)
    const pdfPath = join(invoiceDir, `${baseName}.pdf`)
    const htmlContent = generateDocumentHtml(project, approved, true, invoiceNumber)
    const hash = computeHash(htmlContent)

    if (!existsSync(pdfPath) || this.renderCache.get(pdfPath) !== hash) {
      await this.renderHtmlToPdf(htmlContent, pdfPath)
      this.renderCache.set(pdfPath, hash)
      this.saveCache()
    }
    return { invoiceNumber, pdfPath }
  }

  /**
   * Renders HTML to PDF using an offscreen Electron BrowserWindow,
   * cleaning up the temporary HTML file immediately after export.
   * If running in headless Node without Electron, writes a valid minimal PDF buffer.
   */
  async renderHtmlToPdf(htmlContent, pdfPath) {
    let electron
    try { electron = require('electron') } catch {}

    if (electron && typeof electron.BrowserWindow === 'function') {
      const tempHtmlPath = join(tmpdir(), `kd_doc_${Date.now()}_${Math.random().toString(36).slice(2)}.html`)
      let win = null
      try {
        writeFileSync(tempHtmlPath, htmlContent, 'utf8')
        win = new electron.BrowserWindow({
          show: false,
          width: 1200,
          height: 1600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        })
        await win.loadFile(tempHtmlPath)
        const buffer = await win.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: { marginType: 'none' }
        })
        writeFileSync(pdfPath, buffer)
      } finally {
        if (win && !win.isDestroyed()) {
          win.destroy()
        }
        try {
          if (existsSync(tempHtmlPath)) unlinkSync(tempHtmlPath)
        } catch {}
      }
    } else {
      // In standalone Node.js environment without Electron GUI, write a valid minimal PDF buffer
      const dummyPdfHeader = Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n',
        'utf8'
      )
      writeFileSync(pdfPath, dummyPdfHeader)
    }
  }

  queuePdfGeneration(htmlPath, pdfPath) {
    let electron
    try { electron = require('electron') } catch {}
    if (!electron || typeof electron.BrowserWindow !== 'function') return
    this.pdfQueue.push({ htmlPath, pdfPath })
    this.processPdfQueue()
  }

  async processPdfQueue() {
    if (this.processingPdf || this.pdfQueue.length === 0) return
    this.processingPdf = true

    while (this.pdfQueue.length > 0) {
      const { htmlPath, pdfPath } = this.pdfQueue.shift()
      try {
        await this.renderHtmlFileToPdf(htmlPath, pdfPath)
      } catch (err) {
        console.error('PDF export failed for ' + pdfPath + ':', err.message)
      }
    }

    this.processingPdf = false
  }

  async renderHtmlFileToPdf(htmlPath, pdfPath) {
    if (!existsSync(htmlPath)) return
    let win
    try {
      win = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })
      await win.loadFile(htmlPath)
      const buffer = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' }
      })
      writeFileSync(pdfPath, buffer)
    } finally {
      if (win && !win.isDestroyed()) {
        win.destroy()
      }
    }
  }

  /**
   * Synchronizes all projects into the backup_krishna_decor folder:
   * For every project:
   *   - creates project folder
   *   - creates drafts/ and saves all drafts (only .pdf)
   *   - creates invoice/ and saves approved invoice (only .pdf)
   */
  async syncAllProjects(projects = []) {
    const backupDir = this.getBackupDirectory()
    if (!backupDir) return { success: false, reason: 'No backup directory configured' }

    let syncedProjectsCount = 0
    let draftsCount = 0
    let invoicesCount = 0

    for (const project of projects) {
      if (!project || !project.name) continue
      const dirs = this.ensureProjectFolders(project)
      if (!dirs) continue

      const drafts = await this.saveProjectDrafts(project, dirs.draftsDir)
      draftsCount += drafts.length

      const inv = await this.saveProjectInvoice(project, dirs.invoiceDir)
      if (inv) invoicesCount++

      syncedProjectsCount++
    }

    return {
      success: true,
      backupDirectory: backupDir,
      syncedProjects: syncedProjectsCount,
      totalDrafts: draftsCount,
      totalInvoices: invoicesCount,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Retrieves summary statistics of the backup_krishna_decor folder.
   */
  getStats() {
    const backupDir = this.getBackupDirectory()
    if (!backupDir || !existsSync(backupDir)) {
      return {
        configured: false,
        backupDirectory: '',
        projectCount: 0,
        draftsCount: 0,
        invoicesCount: 0
      }
    }

    let projectCount = 0
    let draftsCount = 0
    let invoicesCount = 0

    try {
      const entries = readdirSync(backupDir, { withFileTypes: true })
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        projectCount++
        const draftsFolder = join(backupDir, ent.name, 'drafts')
        const invoiceFolder = join(backupDir, ent.name, 'invoice')
        if (existsSync(draftsFolder)) {
          draftsCount += readdirSync(draftsFolder).filter(f => f.endsWith('.pdf')).length
        }
        if (existsSync(invoiceFolder)) {
          invoicesCount += readdirSync(invoiceFolder).filter(f => f.endsWith('.pdf')).length
        }
      }
    } catch {}

    return {
      configured: true,
      backupDirectory: backupDir,
      projectCount,
      draftsCount,
      invoicesCount
    }
  }

  /**
   * Opens the main backup folder or a specific project subfolder in Windows Explorer.
   */
  async openFolder(projectName = null, subfolder = null) {
    const backupDir = this.getBackupDirectory()
    if (!backupDir || !existsSync(backupDir)) {
      throw new Error('The backup_krishna_decor folder has not been created yet.')
    }

    let targetPath = backupDir
    if (projectName) {
      const projFolder = sanitizeName(projectName)
      targetPath = join(backupDir, projFolder)
      if (subfolder && ['drafts', 'invoice'].includes(subfolder)) {
        targetPath = join(targetPath, subfolder)
      }
    }

    if (!existsSync(targetPath)) {
      mkdirSync(targetPath, { recursive: true })
    }

    await shell.openPath(targetPath)
    return { opened: true, path: targetPath }
  }
}

module.exports = {
  BackupService,
  sanitizeName,
  computeTotals,
  generateDocumentHtml,
  cleanNonPdfFiles
}
