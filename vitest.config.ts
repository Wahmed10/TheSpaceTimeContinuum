import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts', 'apps/web/test/**/*.test.ts'],
    testTimeout: 30000,
  },
});
