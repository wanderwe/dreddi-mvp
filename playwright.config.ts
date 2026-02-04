import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.ui.spec.ts",
  timeout: 60_000,
  use: {
    baseURL: process.env.DREDDI_BASE_URL || "http://localhost:3000",
    headless: true,
  },
});
