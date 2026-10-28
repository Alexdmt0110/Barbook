import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { requireTestDatabase } from './helpers/test-database';

requireTestDatabase();

const cli = join(
  dirname(require.resolve('prisma/package.json')),
  'build/index.js',
);
for (const args of [
  ['migrate', 'deploy'],
  ['migrate', 'deploy'],
  ['migrate', 'status'],
  [
    'migrate',
    'diff',
    '--from-config-datasource',
    '--to-schema',
    'prisma/schema.prisma',
    '--exit-code',
  ],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Test database preparation failed: prisma ${args.join(' ')}`,
    );
  }
}
