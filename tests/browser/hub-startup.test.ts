import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "@playwright/test";

let browser: Browser;
const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

describe("hub startup", () => {
  it.each([
    ["Play Picture Pairs", "**/play/card-matching"],
    ["Let’s play", "**/play/word-bingo"],
  ])(
    "opens %s while saved progress is still loading",
    async (label, destination) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      let releaseProgress: (() => void) | undefined;
      const progressGate = new Promise<void>((resolve) => {
        releaseProgress = resolve;
      });
      await page.route("**/api/player", async (route) => {
        await progressGate;
        await route.continue().catch(() => {});
      });
      try {
        await page.goto(baseURL);
        const button = page
          .getByRole("article")
          .getByRole("button", { name: label, exact: true });
        await button.click();
        await page.waitForURL(destination);
        expect(page.url()).toContain(destination.replace("**", ""));
      } finally {
        releaseProgress?.();
        await context.close();
      }
    },
  );
});
