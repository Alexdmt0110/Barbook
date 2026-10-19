import { buildPostgresConnectionString } from '../../src/database/postgres-connection-string';

/** Never allow the destructive fixture tests to target an owner's regular database. */
export function requireTestDatabase(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (
    environment.NODE_ENV !== 'test' ||
    environment.BARBOOK_INTEGRATION_TESTS !== '1'
  ) {
    throw new Error(
      'Integration fixtures require NODE_ENV=test and BARBOOK_INTEGRATION_TESTS=1.',
    );
  }

  const database = environment.POSTGRES_DB ?? '';
  const host = environment.DATABASE_HOST ?? '';
  const user = environment.POSTGRES_USER ?? '';
  const password = environment.POSTGRES_PASSWORD ?? '';
  const port = environment.DATABASE_PORT ?? '';

  if (
    !/^barbook_test_[a-z0-9_]+$/.test(database) ||
    database.length > 63 ||
    !['127.0.0.1', 'localhost'].includes(host) ||
    !/^\d+$/.test(port) ||
    Number(port) < 1 ||
    Number(port) > 65535 ||
    !user ||
    !password
  ) {
    throw new Error(
      'Integration fixtures require an explicitly named loopback test database.',
    );
  }

  return buildPostgresConnectionString({
    user,
    password,
    host,
    port,
    database,
  });
}
