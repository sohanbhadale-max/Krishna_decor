const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 1600,
    show: false,
    webPreferences: {
      offscreen: true
    }
  })

  // Find the built css file
  const distAssets = path.resolve(__dirname, '../manager-app/dist/assets')
  const cssFile = fs.readdirSync(distAssets).find(f => f.endsWith('.css'))
  const cssContent = fs.readFileSync(path.join(distAssets, cssFile), 'utf8')
  
  // Resolve image as data URL
  const imgPath = path.resolve(__dirname, '../manager-app/dist/assets', fs.readdirSync(distAssets).find(f => f.includes('document-bg') && f.endsWith('.jpg')))
  const imgBase64 = fs.readFileSync(imgPath).toString('base64')
  const imgDataUri = `data:image/jpeg;base64,${imgBase64}`

  const adjustedCss = cssContent.replace(/url\(\.\/document-bg-[^)]+\)/g, `url(${imgDataUri})`)

  const testCss = `
${adjustedCss}
body {
  margin: 0;
  padding: 24px;
  background: #e5e9f0;
  display: flex;
  justify-content: center;
}

/* Light-colored padding and brown font for invoice number */
.document-title-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  margin: 0;
  padding: 6px 14px;
  background: rgba(255, 253, 250, 0.94);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(160, 115, 85, 0.45);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(90, 45, 24, 0.09);
  color: #5a2d18 !important; /* Brown font */
  font: 700 23px/1.2 Georgia, "DM Serif Display", serif;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.document-title-badge .doc-type-name {
  color: #5a2d18;
}
.document-title-badge .doc-hash {
  font-weight: 400;
  color: #8c5d42;
}
.document-title-badge .doc-number-val {
  color: #5a2d18;
  font-weight: 700;
}
`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${testCss}
</style>
</head>
<body>
  <article class="quotation-sheet document-sheet invoice-sheet">
    <header class="document-header">
      <div class="document-company">
        <h2>Krishna Decor</h2>
        <span class="document-tagline">SPACES DRESSED BEAUTIFULLY</span>
        <p>CTS NO - 1813|2B|2<br />Bapat Galli Car Parking<br /><strong>Belgaum-Karnataka</strong><br />Mob - 9036674138<br />E-mail - krishna.decor2015@gmail.com</p>
        <p class="document-customer"><strong>To:</strong> <strong class="customer-name">Rajesh Sharma</strong><br /><span>Villa Project</span></p>
      </div>
      <div class="document-title">
        <h1 class="document-title-badge">
          <span class="doc-type-name">Tax Invoice</span>
          <span class="doc-hash">#</span>
          <span class="doc-number-val">KD-2026-001</span>
        </h1>
        <p>GSTIN: 29AWZPK1722G1Z4</p>
      </div>
    </header>

    <section class="document-details" aria-label="Tax Invoice details">
      <div><strong>Invoice Date</strong><span>17/10/2026</span></div>
      <div><strong>Payment Terms</strong><span>As agreed</span></div>
      <div><strong>Billing To</strong><span>Rajesh Sharma</span></div>
    </section>

    <!-- TABLE 1: PRODUCTS -->
    <div class="document-table-shell">
      <table class="document-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Taxes</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>American main curtain</strong></td>
            <td><span>18.50 mtr</span></td>
            <td><span>₹1,250.00</span></td>
            <td><span>GST 12%</span></td>
            <td><strong>₹23,125.00</strong></td>
          </tr>
          <tr>
            <td><strong>American sheer</strong></td>
            <td><span>18.50 mtr</span></td>
            <td><span>₹680.00</span></td>
            <td><span>GST 12%</span></td>
            <td><strong>₹12,580.00</strong></td>
          </tr>
          <tr>
            <td><strong>Eylet curtains</strong></td>
            <td><span>14.00 mtr</span></td>
            <td><span>₹950.00</span></td>
            <td><span>GST 12%</span></td>
            <td><strong>₹13,300.00</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TABLE 2: TRACKS, RUNNERS, HOOKS, CLAMPS, STITCHING, INSTALLATION & DELIVERY -->
    <div class="document-table-shell secondary-table-shell">
      <table class="document-table secondary">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Taxes</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Track</strong></td>
            <td><span>24.00 ft</span></td>
            <td><span>₹120.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹2,880.00</strong></td>
          </tr>
          <tr>
            <td><strong>Runners</strong></td>
            <td><span>72 pcs</span></td>
            <td><span>₹5.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹360.00</strong></td>
          </tr>
          <tr>
            <td><strong>Hooks</strong></td>
            <td><span>72 pcs</span></td>
            <td><span>₹3.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹216.00</strong></td>
          </tr>
          <tr>
            <td><strong>Ceiling Clamps</strong></td>
            <td><span>12 pcs</span></td>
            <td><span>₹25.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹300.00</strong></td>
          </tr>
          <tr>
            <td><strong>Living room - American Stitching</strong></td>
            <td><span>37.00 mtr</span></td>
            <td><span>₹90.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹3,330.00</strong></td>
          </tr>
          <tr>
            <td><strong>Installation</strong></td>
            <td><span>1 job</span></td>
            <td><span>₹1,500.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹1,500.00</strong></td>
          </tr>
          <tr>
            <td><strong>Delivery</strong></td>
            <td><span>1 trip</span></td>
            <td><span>₹350.00</span></td>
            <td><span>GST 18%</span></td>
            <td><strong>₹350.00</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

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
        <div class="total-line"><span>Untaxed Amount</span><strong>₹57,941.00</strong></div>
        <div class="total-line"><span>SGST / UTGST</span><strong>₹3,476.46</strong></div>
        <div class="total-line"><span>CGST</span><strong>₹3,476.46</strong></div>
        <div class="total-line total"><span>Total</span><strong>₹64,893.92</strong></div>
      </section>
    </div>

    <footer class="document-footer">
      <div class="document-bank">
        <p>Bank Details</p>
        <strong>KRISHNA DECOR</strong>
        <span>Ac No 917020002479616<br />Axis Bank IFSC CODE UTIB0002941<br />Kadolkar Galli Branch</span>
      </div>
      <div class="document-signature">
        <p>I accept the above tax invoice with the terms and conditions.</p>
        <span>Customer Signature</span>
      </div>
    </footer>
  </article>
</body>
</html>`

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise(r => setTimeout(r, 600))
  await win.webContents.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)')
  await new Promise(r => setTimeout(r, 300))

  const image = await win.capturePage()
  const outPath = path.resolve(__dirname, '../sample-rendered-invoice.png')
  fs.writeFileSync(outPath, image.toPNG())
  console.log('Saved screenshot to:', outPath)
  app.exit(0)
})
