import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../shared/src/db-schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/findarr.db',
  },
});
