import { defineConfig, env } from 'prisma/config';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:password@localhost:5432/postgres';
const directUrl = process.env.DIRECT_URL ?? databaseUrl;

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: env('DATABASE_URL', databaseUrl),
    directUrl: env('DIRECT_URL', directUrl),
  },
});
