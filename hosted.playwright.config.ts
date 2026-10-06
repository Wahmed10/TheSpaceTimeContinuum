import { defineConfig } from '@playwright/test';

const origin = process.env.SPACE_HOSTED_ORIGIN ?? 'http://localhost:3106';
const port = new URL(origin).port || '3106';
export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.SPACE_HOSTED_OUTPUT ?? 'test-results',
  // These suites require physical hardware or a separate production --profile build.
  // Their assertions remain unchanged and are exercised by the dedicated configs.
  testIgnore: [
    '**/phase-four-performance.spec.ts',
    '**/phase-four-search-latency.spec.ts',
    '**/progressive-textures.spec.ts',
    '**/phase-three-device.spec.ts',
    '**/react-profile.spec.ts',
    '**/phase-four-react-profile.spec.ts',
  ],
  grepInvert: /@physical-gpu/,
  timeout: 90000,
  globalTimeout: 25 * 60_000,
  workers: 1,
  retries: 0,
  reporter: [
    ['line'],
    [
      'json',
      {
        outputFile:
          process.env.SPACE_HOSTED_REPORT ?? 'test-results/hosted.json',
      },
    ],
  ],
  snapshotPathTemplate: '{testDir}/visual-reference/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm --filter web exec next start --hostname 0.0.0.0 --port ${port}`,
    url: origin,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
