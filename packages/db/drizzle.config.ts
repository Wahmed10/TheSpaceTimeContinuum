import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './src/config';
import { loadDatabaseEnvironment } from './src/cliEnvironment';

loadDatabaseEnvironment();
// Generation is offline; only commands that connect require credentials.
const migrating = process.argv.includes('migrate');
export default defineConfig({
  dialect: 'postgresql',
  // drizzle-kit joins snapshot paths to cwd; absolute out paths break on Windows.
  // pnpm --filter @space/db always runs from this package directory.
  schema: './src/schema.ts',
  out: './migrations',
  ...(migrating ? { dbCredentials: { url: databaseUrl() } } : {}),
});
