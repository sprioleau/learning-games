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

describe("Number Trail", () => {
  it("lets a child retry and finish five subtraction trails", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/number-trail`);
      await page.getByRole("button", { name: "Subtract", exact: true }).click();
      await page.getByRole("button", { name: "Let’s play" }).click();
      for (let index = 0; index < 5; index++) {
        const equation = page.getByLabel(/minus \d+ equals what\?/);
        const label = await equation.getAttribute("aria-label");
        const match = label?.match(/^(\d+) minus (\d+) equals what\?$/);
        expect(match).toBeTruthy();
        const answer = Number(match![1]) - Number(match![2]);
        const numbers = page.getByRole("group", {
          name: "Choose the answer on the number line",
        });
        if (index === 0) {
          await numbers
            .getByRole("button", {
              name: new RegExp(`^Choose ${(answer + 1) % 11}(?:,|$)`),
            })
            .click();
          await page
            .getByRole("status")
            .filter({ hasText: "try again" })
            .waitFor();
        }
        await numbers
          .getByRole("button", { name: new RegExp(`^Choose ${answer}(?:,|$)`) })
          .click();
        if (index < 4)
          await page.getByText(`TRAIL ${index + 2} OF 5`).waitFor();
        if (index === 1) {
          await page.reload();
          await page.getByText("TRAIL 3 OF 5").waitFor();
        }
      }
      await page.getByRole("heading", { name: "Trail complete!" }).waitFor();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: "Trail complete!" }).waitFor();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Play again" }).click();
      await page
        .getByRole("group", { name: "Choose the answer on the number line" })
        .waitFor();
      expect(
        await page
          .getByRole("group", { name: "Choose the answer on the number line" })
          .getByRole("button")
          .count(),
      ).toBe(11);
    } finally {
      await context.close();
    }
  }, 120000);
});
