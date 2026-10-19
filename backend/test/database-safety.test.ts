import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireTestDatabase } from './helpers/test-database';

const safeEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  BARBOOK_INTEGRATION_TESTS: '1',
  POSTGRES_DB: 'barbook_test_integration',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '5432',
  POSTGRES_USER: 'fixture_user',
  POSTGRES_PASSWORD: 'synthetic_fixture_password',
};

void test('allows only an explicitly opted-in disposable local database', () => {
  const url = new URL(requireTestDatabase(safeEnvironment));
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/barbook_test_integration');
});

for (const override of [
  { NODE_ENV: 'production' },
  { BARBOOK_INTEGRATION_TESTS: '' },
  { POSTGRES_DB: 'barbook' },
  { POSTGRES_DB: 'postgres' },
  { POSTGRES_DB: 'barbook_test_' },
  { POSTGRES_DB: 'barbook_test_x;DROP DATABASE barbook' },
  { DATABASE_HOST: 'database.example.com' },
  { DATABASE_PORT: 'invalid' },
  { POSTGRES_PASSWORD: '' },
]) {
  void test(`refuses unsafe fixture configuration ${JSON.stringify(override)}`, () => {
    assert.throws(() =>
      requireTestDatabase({ ...safeEnvironment, ...override }),
    );
  });
}
