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
describe("Picture Pairs adventure", () => {
  it("plays a mismatch, restores a revealed card, finishes ten pairs, and saves the reward", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(baseURL);
      await page.getByRole("button", { name: "Play Picture Pairs" }).click();
      await page.waitForURL("**/play/card-matching");
      await page.getByRole("button", { name: "Let’s play" }).click();
      const board = page.getByRole("group", { name: "Matching cards" });
      await board.waitFor();
      const response = await page.request.get(`${baseURL}/api/player`);
      const saved = await response.json();
      expect(saved.storage).toBe("cloud");
      const faces: string[] = saved.state.matchingSession.board;
      expect(faces).toHaveLength(20);
      const first = 0;
      const other = faces.findIndex((face) => face !== faces[first]);
      await board
        .getByRole("button", {
          name: `Card ${first + 1}, face down`,
          exact: true,
        })
        .click();
      await board
        .getByRole("button", {
          name: `Card ${other + 1}, face down`,
          exact: true,
        })
        .click();
      await page.getByRole("status").filter({ hasText: "different" }).waitFor();
      await board
        .getByRole("button", {
          name: `Card ${first + 1}, face down`,
          exact: true,
        })
        .waitFor({ timeout: 5000 });
      await board
        .getByRole("button", {
          name: `Card ${first + 1}, face down`,
          exact: true,
        })
        .click();
      await page.waitForFunction(async () => {
        const response = await fetch("/api/player", { cache: "no-store" });
        const data = await response.json();
        return data.state.matchingSession?.revealed?.length === 1;
      });
      await page.reload();
      await board
        .getByRole("button", { name: /^Card 1, .+(island|star)/ })
        .waitFor();
      const partner = faces.findIndex(
        (face, index) => index !== first && face === faces[first],
      );
      await board
        .getByRole("button", {
          name: `Card ${partner + 1}, face down`,
          exact: true,
        })
        .click();
      await page.getByRole("status").filter({ hasText: "A match!" }).waitFor();
      for (const face of new Set(faces)) {
        if (face === faces[first]) continue;
        const pair = faces.flatMap((item, index) =>
          item === face ? [index] : [],
        );
        for (const index of pair) {
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
      expect(await win.getByText("+1 star", { exact: true }).isVisible()).toBe(
        true,
      );
      expect(
        await win.getByText("+100 points", { exact: true }).isVisible(),
      ).toBe(true);
      await page.reload();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page
        .getByRole("dialog", { name: "All pairs found!" })
        .getByRole("link", { name: "Back to my adventure" })
        .click();
      await page.getByRole("button", { name: "My stars" }).click();
      expect(
        await page.getByText("1. Picture Pairs", { exact: true }).isVisible(),
      ).toBe(true);
    } finally {
      await context.close();
    }
  }, 120000);
});
