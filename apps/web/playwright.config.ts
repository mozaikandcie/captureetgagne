import { defineConfig } from '@playwright/test'

// Parcours de bout en bout, contre l'application lancée (`npm run dev`) et le projet Supabase de `.env`.
// PLAYWRIGHT_CHROMIUM_PATH : navigateur déjà installé (sinon `npx playwright install chromium`).
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'fr-FR',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
})
