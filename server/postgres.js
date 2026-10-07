let schemaPromise

export function database(createDatabaseClient) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.')
  return createDatabaseClient(process.env.DATABASE_URL)
}

export async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS kd_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS kd_users_role_name_key ON kd_users (role, lower(name))`
      await sql`CREATE TABLE IF NOT EXISTS kd_projects (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )`
      await sql`CREATE TABLE IF NOT EXISTS kd_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES kd_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`
      await sql`CREATE INDEX IF NOT EXISTS kd_sessions_user_id_idx ON kd_sessions (user_id)`
      await sql`CREATE INDEX IF NOT EXISTS kd_sessions_expires_at_idx ON kd_sessions (expires_at)`
    })().catch((error) => {
      schemaPromise = undefined
      throw error
    })
  }
  return schemaPromise
}

export function projectFromRow(row) {
  return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
}
