import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    video: "on-first-retry",
    locale: "he-IL",
  },
  expect: {
    toHaveScreenshot: {
      // Linux CI vs local OS may differ slightly in font rasterization.
      maxDiffPixelRatio: 0.08,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx http-server -p 4173 -c-1 .",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
