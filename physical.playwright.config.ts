import { defineConfig } from '@playwright/test';
import functional from './hosted.playwright.config';

export default defineConfig(functional, {
  globalTimeout: 90 * 60_000,
  testIgnore: [],
  grepInvert: /a^/,
  projects: [
    {
      name: 'physical-device',
      testMatch: [
        '**/phase-four-performance.spec.ts',
        '**/phase-four-search-latency.spec.ts',
        '**/progressive-textures.spec.ts',
        '**/phase-three-device.spec.ts',
      ],
    },
    {
      name: 'physical-streaming-timing',
      testMatch: '**/progressive-data.spec.ts',
      grep: /@physical-gpu/,
    },
  ],
  use: {
    channel: 'chromium',
    launchOptions: {
      args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
    },
  },
});
