import { defineConfig } from "@playwright/test";

const externalUrl = process.env.HEIST_TEST_URL;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90000,
  workers: 1,
  use: {
    channel: process.env.HEIST_BROWSER_CHANNEL,
    baseURL: externalUrl ?? "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: externalUrl
    ? undefined
    : {
        command: "npm start -- --test --port 3100 --data-dir test-results/rooms",
        url: "http://127.0.0.1:3100/api/health",
        reuseExistingServer: false,
        timeout: 30000,
      },
});
