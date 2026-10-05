import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: '../e2e',
  testMatch: 'data-status.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  outputDir: resolve(
    process.env.SPACE_API_RUN_DIRECTORY ?? '.tools/phase-five/api-browser',
    process.env.SPACE_API_CONFIGURED === '1'
      ? 'configured-results'
      : 'unconfigured-results',
  ),
  reporter: [['json', { outputFile: process.env.SPACE_API_REPORT }]],
  use: {
    baseURL: process.env.SPACE_API_ORIGIN ?? 'http://127.0.0.1:3104',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
    trace: 'retain-on-failure',
  },
});
