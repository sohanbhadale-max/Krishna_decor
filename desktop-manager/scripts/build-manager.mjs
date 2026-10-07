import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const managerDirectory = resolve(here, '../../manager-app')
const isWindows = process.platform === 'win32'
const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm'
const args = isWindows ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build']
const buildEnvironment = { ...process.env }
delete buildEnvironment.VITE_API_URL

const child = spawn(command, args, {
  cwd: managerDirectory,
  stdio: 'inherit',
  env: buildEnvironment
})

child.once('exit', (code) => process.exitCode = code || 0)
child.once('error', (error) => {
  console.error('Unable to build the manager desktop interface:', error.message)
  process.exitCode = 1
})
