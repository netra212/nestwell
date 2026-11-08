import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 2,
  fullyParallel: true,
  timeout: 30000,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    viewport: { width: 1366, height: 900 },
    launchOptions: {
      executablePath: process.env.CHROME_PATH,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  reporter: "list",
});
