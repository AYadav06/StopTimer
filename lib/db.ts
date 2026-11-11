import { attachDatabasePool } from '@vercel/functions'
import { Pool } from 'pg'
import './network.ts'

/**
 * A single pool is shared across hot reloads in development and reused by every
 * request in production. Next.js route handlers run on the Node.js runtime, so
 * node-postgres with Neon's pooled connection string is the right fit here.
 */
const globalForDb = globalThis as unknown as { timerPool?: Pool }

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Run `neon deploy` (or `neon env pull`) to pull the database credentials into .env.local, and set DATABASE_URL in the Vercel project settings.',
    )
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

  // On Vercel this keeps the Fluid compute instance alive long enough to close
  // idle connections; it is a no-op on other platforms.
  attachDatabasePool(pool)
  return pool
}

export const pool = globalForDb.timerPool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.timerPool = pool
}

let schemaReady: Promise<void> | null = null

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS timer_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL DEFAULT '',
    name text NOT NULL,
    duration_ms bigint,
    elapsed_ms bigint NOT NULL DEFAULT 0,
    started_at timestamptz,
    status text NOT NULL DEFAULT 'idle'
      CHECK (status IN ('idle', 'running', 'paused', 'stopped', 'completed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  ALTER TABLE timer_sessions
    ADD COLUMN IF NOT EXISTS user_email text NOT NULL DEFAULT '';

  CREATE INDEX IF NOT EXISTS timer_sessions_user_email_idx
    ON timer_sessions (user_email);

  CREATE INDEX IF NOT EXISTS timer_sessions_created_at_idx
    ON timer_sessions (created_at DESC);

  CREATE TABLE IF NOT EXISTS timer_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS timer_users_email_idx
    ON timer_users (email);
`

/**
 * Creates the sessions table the first time a request needs it. The statement is
 * idempotent, so it is safe to run on every cold start.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).then(
      () => undefined,
      (error) => {
        // Let the next request try again instead of caching the failure forever.
        schemaReady = null
        throw error
      },
    )
  }
  return schemaReady
}

import { compare, hash } from 'bcrypt'

/** Verify a plaintext password against the stored bcrypt hash. */
export async function verifyPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const result = await pool.query<{ password_hash: string }>(
    'SELECT password_hash FROM timer_users WHERE email = $1',
    [email.toLowerCase()],
  )
  if (result.rowCount === 0) return false
  return await compare(password, result.rows[0].password_hash)
}

/** Create a user with a bcrypt-hashed password. Idempotent by email. */
export async function createUser(
  email: string,
  password: string,
): Promise<{ created: boolean }> {
  const normalized = email.toLowerCase()
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM timer_users WHERE email = $1',
    [normalized],
  )
  if ((existing.rowCount ?? 0) > 0) return { created: false }

  const passwordHash = await hash(password, 10)

  await pool.query(
    'INSERT INTO timer_users (email, password_hash) VALUES ($1, $2)',
    [normalized, passwordHash],
  )
  return { created: true }
}
