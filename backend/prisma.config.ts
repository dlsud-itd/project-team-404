import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    directUrl: process.env.DIRECT_URL ?? '',
  },
});
