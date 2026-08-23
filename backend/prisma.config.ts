import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadEnv({ path: '../.env' });

const databaseUser = encodeURIComponent(env('POSTGRES_USER'));
const databasePassword = encodeURIComponent(env('POSTGRES_PASSWORD'));
const databaseHost = env('DATABASE_HOST');
const databasePort = env('DATABASE_PORT');
const databaseName = encodeURIComponent(env('POSTGRES_DB'));

const databaseUrl =
  `postgresql://${databaseUser}:${databasePassword}` +
  `@${databaseHost}:${databasePort}/${databaseName}?schema=public`;

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
  },

  datasource: {
    url: databaseUrl,
  },
});
