import { Pool } from 'pg';
import { requireTestDatabase } from './helpers/test-database';

// CLI fixture only: excluded from production build, no HTTP test route.
async function expire(): Promise<void> {
  const connectionString = requireTestDatabase();
  const userId = process.argv[2];
  if (!userId || userId.length > 128)
    throw new Error('A fixture user is required.');
  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query(
      `UPDATE "Session" SET
      "createdAt"=statement_timestamp()-interval '3 hours',
      "lastSeenAt"=statement_timestamp()-interval '2 hours',
      "idleExpiresAt"=date_trunc('milliseconds', statement_timestamp())
      WHERE "userId"=$1 AND "revokedAt" IS NULL`,
      [userId],
    );
    if (result.rowCount !== 1)
      throw new Error('Expected one disposable browser session.');
  } finally {
    await pool.end();
  }
}

void expire().catch(() => {
  process.stderr.write('Disposable session expiry failed.\n');
  process.exitCode = 1;
});
