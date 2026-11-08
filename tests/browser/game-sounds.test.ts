import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "@playwright/test";
let browser: Browser;
const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});
async function getCueCount(page: Page) {
  return page.evaluate(
    () => (window as unknown as { cueCount: number }).cueCount,
  );
}
describe("game sound feedback", () => {
  it.each(["word-builder", "fraction-cafe", "math-drops", "number-trail"])(
    "plays incorrect and correct cues in %s",
    async (game) => {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.addInitScript(() => {
        const target = window as unknown as { cueCount: number };
        target.cueCount = 0;
        const original = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (
          ...args: Parameters<typeof original>
        ) {
          target.cueCount++;
          return original.apply(this, args);
        };
      });
      try {
        await page.goto(`${baseURL}/play/${game}`);
        await page
          .getByRole("button", {
            name: game === "math-drops" ? "Start playing" : "Let’s play",
          })
          .click();
        if (game === "word-builder") {
          await page.getByRole("button", { name: "Hear the word" }).waitFor();
          await page.keyboard.type("xof");
          await page.keyboard.press("Enter");
          await page
            .getByRole("status")
            .filter({ hasText: "Try again" })
            .waitFor();
          await page.keyboard.press("Backspace");
          await page.keyboard.press("Backspace");
          await page.keyboard.press("Backspace");
          await page.keyboard.type("fox");
          await page.keyboard.press("Enter");
          await page.getByText("WORD 2 OF 5").waitFor();
        } else if (game === "fraction-cafe") {
          await page.getByRole("button", { name: "Serve order" }).click();
          await page
            .getByRole("status")
            .filter({ hasText: "Try again" })
            .waitFor();
          await page.getByRole("button", { name: "Piece 1" }).click();
          await page.getByRole("button", { name: "Serve order" }).click();
          await page.getByText("ORDER 2 OF 5").waitFor();
        } else if (game === "math-drops") {
          const panel = page.getByLabel("Falling math problem");
          await panel.getByText(/\d+ \+ \d+/).waitFor();
          const match = (await panel.innerText()).match(/(\d+) \+ (\d+)/)!;
          const answer = Number(match[1]) + Number(match[2]);
          const input = page.getByRole("textbox", { name: "Your answer" });
          await input.fill(String(answer + 1));
          await page.keyboard.press("Enter");
          await page
            .getByRole("status")
            .filter({ hasText: "Not quite" })
            .waitFor();
          await input.fill(String(answer));
          await page.keyboard.press("Enter");
          await page.getByText("1 / 8 solved").waitFor();
        } else {
          const text = await page
            .getByLabel(/equals what\?/)
            .getAttribute("aria-label");
          const match = text!.match(/(\d+) plus (\d+)/)!;
          const answer = Number(match[1]) + Number(match[2]);
          await page
            .getByRole("button", {
              name: new RegExp(`^Choose ${(answer + 1) % 11}(?:,|$)`),
            })
            .click();
          await page
            .getByRole("status")
            .filter({ hasText: "Not quite" })
            .waitFor();
          await page
            .getByRole("button", {
              name: new RegExp(`^Choose ${answer}(?:,|$)`),
            })
            .click();
          await page.getByText("TRAIL 2 OF 5").waitFor();
        }
        expect(await getCueCount(page)).toBeGreaterThanOrEqual(2);
      } finally {
        await context.close();
      }
    },
    60000,
  );
});
