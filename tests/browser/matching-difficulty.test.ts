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

describe("Picture Pairs difficulty", () => {
  it.each([4, 6, 10])(
    "plays and saves a %i-pair round",
    async (pairCount) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      try {
        await page.goto(`${baseURL}/play/card-matching`);
        await page
          .getByRole("button", { name: `${pairCount} pairs`, exact: true })
          .click();
        await page.getByRole("button", { name: "Let’s play" }).click();
        const board = page.getByRole("group", { name: "Matching cards" });
        await board.waitFor();
        expect(await board.getByRole("button").count()).toBe(pairCount * 2);
        const response = await page.request.get(`${baseURL}/api/player`);
        const saved = await response.json();
        const faces: string[] = saved.state.matchingSession.board;
        for (const face of new Set(faces)) {
          for (const index of faces.flatMap((item, index) =>
            item === face ? [index] : [],
          )) {
            await board
              .getByRole("button", {
                name: `Card ${index + 1}, face down`,
                exact: true,
              })
              .click();
          }
        }
        const win = page.getByRole("dialog", { name: "All pairs found!" });
        await win.waitFor({ timeout: 30000 });
        expect(
          await win
            .getByText(`You matched all ${pairCount} pairs.`, { exact: false })
            .isVisible(),
        ).toBe(true);
        await page.reload();
        await page.getByLabel("1 star", { exact: true }).waitFor();
        await page
          .getByRole("dialog", { name: "All pairs found!" })
          .getByRole("button", { name: "Play again" })
          .click();
        await page
          .getByRole("dialog", { name: "All pairs found!" })
          .waitFor({ state: "hidden" });
        expect(await board.getByRole("button").count()).toBe(pairCount * 2);
      } finally {
        await context.close();
      }
    },
    120000,
  );
});
