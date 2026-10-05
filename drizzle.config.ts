import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/data/db/schema.ts',
  out: './src/data/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
