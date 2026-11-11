/**
 * Creates the timer_sessions table if it does not exist yet.
 *
 *   npm run db:init
 *
 * Uses the same lazy `ensureSchema()` the route handlers call, so the migration
 * lives in exactly one place. `--env-file-if-exists=.env.local` loads the
 * credentials that `neon deploy` pulled.
 */
import { ensureSchema, pool } from '../lib/db.ts'

try {
  await ensureSchema()
  const { rows } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'timer_sessions'`,
  )
  if (rows.length === 0) {
    throw new Error('timer_sessions table was not created.')
  }
  console.log('Schema ready: timer_sessions exists.')
} finally {
  await pool.end()
}
