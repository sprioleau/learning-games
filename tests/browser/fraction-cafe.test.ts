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

describe("Fraction Café", () => {
  it("saves completed orders, restores a game, and awards its star once", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/fraction-cafe`);
      await page.getByRole("button", { name: "Let’s play" }).click();
      await page
        .getByRole("heading", { name: "Can I have one half?" })
        .waitFor();
      await page.getByRole("button", { name: "Serve order" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Try again!" })
        .waitFor();
      await page.getByRole("button", { name: "Piece 1", exact: true }).click();
      await page.getByRole("button", { name: "Serve order" }).click();
      await page
        .getByRole("heading", { name: "Can I have one quarter?" })
        .waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: "Can I have one quarter?" })
        .waitFor();
      for (const [count, next] of [
        [1, "three quarters"],
        [3, "two quarters"],
        [2, "one half"],
      ] as const) {
        for (let index = 1; index <= count; index++)
          await page
            .getByRole("button", { name: `Piece ${index}`, exact: true })
            .click();
        await page.getByRole("button", { name: "Serve order" }).click();
        await page
          .getByRole("heading", { name: `Can I have ${next}?` })
          .waitFor();
      }
      await page.getByRole("button", { name: "Piece 1", exact: true }).click();
      await page.getByRole("button", { name: "Serve order" }).click();
      await page.getByRole("heading", { name: "Delicious work!" }).waitFor();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: "Delicious work!" }).waitFor();
      expect(await page.getByLabel("1 star", { exact: true }).isVisible()).toBe(
        true,
      );
      expect(await page.getByText("+1 star · +100 points").isVisible()).toBe(
        true,
      );
    } finally {
      await context.close();
    }
  }, 120000);
});
