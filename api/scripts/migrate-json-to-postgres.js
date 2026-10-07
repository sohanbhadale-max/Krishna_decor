import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { database, ensureSchema } from '../src/postgres.js'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const sourceFile = process.env.KD_LOCAL_DATA_FILE || join(scriptDirectory, '..', 'data', 'krishna-decor.json')

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before importing local data.')
if (!existsSync(sourceFile)) throw new Error('Local data file was not found: ' + sourceFile)

const source = JSON.parse(readFileSync(sourceFile, 'utf8'))
const users = Array.isArray(source.users) ? source.users : []
const projects = Array.isArray(source.projects) ? source.projects : []
const sql = database()
await ensureSchema(sql)

for (const user of users) {
  const passwordHash = user.passwordHash || user.password_hash
  if (!user.id || !user.name || !passwordHash || !['manager', 'staff'].includes(user.role)) continue
  await sql`INSERT INTO kd_users (id, name, role, password_hash, created_at)
    VALUES (${user.id}, ${user.name}, ${user.role}, ${passwordHash}, ${user.createdAt || new Date().toISOString()})
    ON CONFLICT (id) DO NOTHING`
}

for (const project of projects) {
  if (!project.id) continue
  const createdAt = project.createdAt || new Date().toISOString()
  const updatedAt = project.updatedAt || createdAt
  const payload = {
    ...project,
    createdAt,
    updatedAt,
    staffDrafts: project.staffDrafts || [],
    activityLog: project.activityLog || [],
    syncMutations: project.syncMutations || []
  }
  await sql`INSERT INTO kd_projects (id, payload, created_at, updated_at)
    VALUES (${payload.id}, ${JSON.stringify(payload)}::jsonb, ${createdAt}, ${updatedAt})
    ON CONFLICT (id) DO NOTHING`
}

console.log('Imported ' + users.length + ' user records and ' + projects.length + ' project records. Existing database rows were left unchanged.')
