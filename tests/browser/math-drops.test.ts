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
describe("Math Drops", () => {
  it("plays subtraction using the on-screen number pad and celebrates a full round", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/math-drops`);
      await page.getByRole("button", { name: "Subtract −" }).click();
      await page.getByRole("button", { name: "Start playing" }).click();
      const panel = page.getByLabel("Falling math problem");
      await panel.getByText(/\d+ − \d+/).waitFor();
      const input = page.getByRole("textbox", { name: "Your answer" });
      await input.focus();
      for (let count = 0; count < 8; count++) {
        const text = await panel.innerText();
        const parts = text.match(/(\d+) − (\d+)/);
        expect(parts).not.toBeNull();
        const answer = String(Number(parts![1]) - Number(parts![2]));
        if (count === 0) {
          await page.keyboard.type(String(Number(answer) + 1));
          await page.keyboard.press("Enter");
          await page
            .getByRole("status")
            .filter({ hasText: "Not quite" })
            .waitFor();
          expect(
            await input.evaluate(
              (element) => document.activeElement === element,
            ),
          ).toBe(true);
        }
        if (count < 2) {
          await page.keyboard.type(answer);
          expect(
            await page
              .getByText(`${count} / 8 solved`, { exact: true })
              .isVisible(),
          ).toBe(true);
          await page.keyboard.press("Enter");
        } else {
          for (const digit of answer)
            await page
              .getByRole("button", { name: digit, exact: true })
              .click();
          await page.getByRole("button", { name: "Go!" }).click();
        }
        await page
          .getByText(`${count + 1} / 8 solved`, { exact: true })
          .waitFor();
        if (count < 7) {
          expect(
            await input.evaluate(
              (element) => document.activeElement === element,
            ),
          ).toBe(true);
        }
        if (count === 1) {
          await page.reload();
          await page.getByText("2 / 8 solved", { exact: true }).waitFor();
        }
      }
      await page.getByRole("dialog", { name: "Splash-tastic!" }).waitFor();
      await page.reload();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page.getByRole("dialog", { name: "Splash-tastic!" }).waitFor();
    } finally {
      await context.close();
    }
  }, 60000);
  it("replaces an expired drop without scoring and disables answer history", async () => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/math-drops`);
      await page.getByRole("button", { name: "Quick" }).click();
      await page.getByRole("button", { name: "Start playing" }).click();
      const input = page.getByRole("textbox", { name: "Your answer" });
      expect(await input.getAttribute("autocomplete")).toBe("off");
      const panel = page.getByLabel("Falling math problem");
      const before = await panel.innerText();
      const splash = page.locator(".math-drops-splash");
      await splash.waitFor({ timeout: 20000 });
      expect(await splash.locator("span").count()).toBe(9);
      await page
        .getByRole("status")
        .filter({ hasText: "Here's a new problem" })
        .waitFor({ timeout: 20000 });
      expect(await panel.innerText()).not.toBe(before);
      expect(await page.getByText("0 / 8 solved").isVisible()).toBe(true);
    } finally {
      await context.close();
    }
  }, 30000);
});
