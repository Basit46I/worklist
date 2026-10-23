import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/*.spec.ts',
    fullyParallel: false,
    reporter: 'list',
    retries: 0,
    use: {
        baseURL: process.env.WORKLIST_E2E_BASE_URL ?? 'http://localhost:3000',
        browserName: 'chromium',
        headless: true,
        trace: 'off',
        screenshot: 'off',
        video: 'off'
    }
})
