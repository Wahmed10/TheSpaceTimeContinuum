import { defineConfig } from '@playwright/test';
import functional from './hosted.playwright.config';

export default defineConfig(functional, {
  testIgnore: [],
  testMatch: [
    '**/react-profile.spec.ts',
    '**/phase-four-react-profile.spec.ts',
  ],
  globalTimeout: 10 * 60_000,
});
