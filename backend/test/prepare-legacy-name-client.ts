import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireTestDatabase } from './helpers/test-database';

// Generation only, guarded to the same disposable integration/browser environment.
requireTestDatabase();
const schema = readFileSync(join(__dirname, '../prisma/schema.prisma'), 'utf8')
  .replace('  nameKey String @default("")\n', '')
  .replace('  @@unique([workspaceId, nameKey])\n', '');
if (
  createHash('sha256').update(schema).digest('hex') !==
  '545a7abd53644ead24a6f0a6993aeb32f216ad1a66fb47892b47b861cc02bea0'
)
  throw new Error(
    'Legacy schema differs from main8bfaef93; review rollback compatibility explicitly.',
  );
const path = join(__dirname, '../prisma/.legacy-name-client.prisma');
try {
  writeFileSync(
    path,
    schema.replace(
      '../src/generated/prisma',
      '../src/generated/prisma/legacy-name-client',
    ),
  );
  const result = spawnSync(
    process.execPath,
    [
      join(dirname(require.resolve('prisma/package.json')), 'build/index.js'),
      'generate',
      '--schema',
      path,
    ],
    { stdio: 'inherit' },
  );
  if (result.error || result.status !== 0)
    throw new Error('Legacy Prisma client generation failed.');
} finally {
  unlinkSync(path);
}
