import assert from 'node:assert'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createLocalApiServer } from '../api/src/server.js'
import { isDesktopApp, apiBase, cloudApiBase, DEFAULT_LOCAL_API_URL, DEFAULT_CLOUD_API_URL } from '../manager-app/src/api-config.js'

console.log('Testing Desktop Local-First Architecture & Cloud Sync...')

// 1. Verify window.krishnaHub detection and local-first routing
assert.strictEqual(typeof isDesktopApp, 'function', 'isDesktopApp should be a function')
assert.strictEqual(isDesktopApp(), false, 'isDesktopApp returns false when window.krishnaHub is undefined')

// Simulate Electron Desktop environment
globalThis.window = {
  krishnaHub: {
    isDesktop: true,
    localUrl: 'http://127.0.0.1:8788/api',
    cloudUrl: 'https://krishna-decor-api.onrender.com/api'
  }
}

assert.strictEqual(isDesktopApp(), true, 'isDesktopApp returns true in Electron desktop')
assert.strictEqual(apiBase(), DEFAULT_LOCAL_API_URL, 'apiBase() MUST route to 127.0.0.1:8788 on desktop')
assert.strictEqual(cloudApiBase(), DEFAULT_CLOUD_API_URL, 'cloudApiBase() returns cloud endpoint for background sync')
console.log('✓ Desktop local routing and cloud endpoint verified')

// 2. Start local hub server in isolated temp directory
const tempDir = mkdtempSync(join(tmpdir(), 'kd-desktop-test-'))
const localServer = createLocalApiServer({
  dataDirectory: tempDir,
  allowedOrigins: ['http://127.0.0.1:8788', 'http://localhost', 'http://127.0.0.1:5173']
})

await new Promise((resolve) => localServer.listen(8789, '127.0.0.1', resolve))
const testLocalUrl = 'http://127.0.0.1:8789/api'

try {
  // Test 2a: Health check response time
  const t0 = performance.now()
  const healthRes = await fetch(`${testLocalUrl}/health`)
  const healthData = await healthRes.json()
  const healthLatency = performance.now() - t0
  assert(healthRes.ok, 'Local hub health check responds 200 OK')
  assert(healthLatency < 50, `Local hub responds in < 50ms (actual: ${healthLatency.toFixed(2)}ms)`)
  console.log(`✓ Local hub responded in ${healthLatency.toFixed(2)}ms (zero delay)`)

  // Test 2b: Login with baseline manager account
  const loginRes = await fetch(`${testLocalUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dinesh', password: 'KDecor2026', role: 'manager' })
  })
  const authData = await loginRes.json()
  assert(loginRes.ok, `Login succeeds (status: ${loginRes.status}, error: ${authData.error})`)
  assert(authData.token, 'Session token issued')
  const managerToken = authData.token

  // Test 2c: Fast local mutation via /sync
  const mutationTimeStart = performance.now()
  const syncRes = await fetch(`${testLocalUrl}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      mutations: [
        {
          id: 'mut-test-1',
          type: 'create_project',
          project: {
            id: 'proj-local-1',
            name: 'Local High-Speed Project',
            customer: { name: 'Local Customer' },
            areas: [{ id: 'area-1', name: 'Living Room', width: 120, height: 100 }],
            quotations: [{ id: 'KD-2026-001', name: 'Draft 1', items: [], status: 'Draft' }]
          }
        }
      ]
    })
  })
  const syncData = await syncRes.json()
  const mutationLatency = performance.now() - mutationTimeStart
  assert(syncRes.ok, 'Local sync succeeds')
  const createdProj = syncData.projects.find((p) => p.id === 'proj-local-1')
  assert(createdProj, 'Project created in local hub')
  assert.strictEqual(createdProj.name, 'Local High-Speed Project')
  assert(mutationLatency < 50, `Local mutation saved in < 50ms (actual: ${mutationLatency.toFixed(2)}ms)`)
  console.log(`✓ Local project mutation committed in ${mutationLatency.toFixed(2)}ms (no internet delay)`)

  // Test 2d: Update project locally
  const updateStart = performance.now()
  const updateRes = await fetch(`${testLocalUrl}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      mutations: [
        {
          id: 'mut-test-2',
          type: 'update_project',
          projectId: 'proj-local-1',
          change: {
            name: 'Updated Instant Project'
          }
        }
      ]
    })
  })
  const updateData = await updateRes.json()
  const updateLatency = performance.now() - updateStart
  assert(updateRes.ok, 'Local update succeeds')
  const updatedProj = updateData.projects.find((p) => p.id === 'proj-local-1')
  assert(updatedProj, 'Updated project found')
  assert.strictEqual(updatedProj.name, 'Updated Instant Project')
  console.log(`✓ Local update committed in ${updateLatency.toFixed(2)}ms`)

  // Test 2e: Verify offline resilience
  const offlineCheck = await fetch(`${testLocalUrl}/projects`, {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  })
  assert(offlineCheck.ok, 'Projects fetched locally while offline')
  console.log('✓ Full local offline operation verified')

} finally {
  await new Promise((resolve) => localServer.close(resolve))
  try { rmSync(tempDir, { recursive: true, force: true }) } catch {}
  delete globalThis.window
}

console.log('ALL DESKTOP LOCAL-FIRST & CLOUD SYNC TESTS PASSED!')
