import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../../packages/shared/src/db-schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/findarr.db',
  },
});
