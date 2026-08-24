import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { buildPostgresConnectionString } from './src/database/postgres-connection-string';

loadEnv({ path: '../.env' });

function resolveDatabaseUrl(): string | undefined {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const database = process.env.POSTGRES_DB;

  if (!user || !password || !host || !port || !database) {
    return undefined;
  }

  return buildPostgresConnectionString({
    user,
    password,
    host,
    port,
    database,
  });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  datasource: {
    url: resolveDatabaseUrl(),
  },
});
