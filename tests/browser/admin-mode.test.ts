import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import { worlds } from "../../src/lib/games/worlds";
let browser: Browser;
const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});
describe("password-protected demo coverage", () => {
  it("rejects wrong passwords, completes both word collections in every world, and restores normal locks after logout", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/admin`);
      await page.getByLabel("Password", { exact: true }).fill("wrong");
      await page.getByRole("button", { name: "Unlock demo mode" }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "isn’t correct" })
        .waitFor();
      expect(
        (await (await page.request.get(`${baseURL}/api/admin`)).json())
          .isAdminMode,
      ).toBe(false);
      await page.getByLabel("Password", { exact: true }).fill("admin");
      await page.getByRole("button", { name: "Unlock demo mode" }).click();
      await page
        .getByRole("heading", { name: "Every world is ready!" })
        .waitFor();
      expect(
        (await (await page.request.get(`${baseURL}/api/player`)).json())
          .isAdminMode,
      ).toBe(true);
      for (const wordSet of ["starter", "sight"] as const) {
        for (const world of worlds) {
          await page
            .getByRole("button", {
              name: wordSet === "starter" ? "Starter words" : "Sight words",
              exact: true,
            })
            .click();
          await page
            .getByRole("button", { name: `Demo ${world.name}`, exact: true })
            .click();
          const prompt = page.getByLabel("Word to find", { exact: true });
          await prompt.waitFor();
          const board = page.getByRole("group", {
            name: "Word board, five rows and five columns",
          });
          expect(await board.getByRole("button").count()).toBe(25);
          for (let turn = 0; turn < 25; turn++) {
            if (!(await prompt.isVisible())) break;
            const word = (await prompt.textContent())!;
            await board
              .getByRole("button", { name: word, exact: true })
              .click();
            await page.waitForFunction((previous) => {
              const current = document.querySelector(
                '[aria-label="Word to find"]',
              );
              return !current || current.textContent !== previous;
            }, word);
          }
          const win = page.getByRole("dialog", { name: "Biiig bingo moment!" });
          await win.waitFor();
          expect(
            await win.getByText("+1 star", { exact: true }).isVisible(),
          ).toBe(true);
          const saved = await (
            await page.request.get(`${baseURL}/api/player`)
          ).json();
          expect(saved.state.session.worldId).toBe(world.id);
          expect(saved.state.session.options.wordSet).toBe(wordSet);
          expect(saved.state.session.phase).toBe("won");
          await win.getByRole("link", { name: "Back to my adventure" }).click();
          await page
            .getByRole("link", { name: "Demo mode", exact: true })
            .click();
          await page
            .getByRole("heading", { name: "Every world is ready!" })
            .waitFor();
        }
      }
      await page.getByRole("button", { name: "Exit demo mode" }).click();
      await page.getByLabel("Password", { exact: true }).waitFor();
      const normal = await (
        await page.request.get(`${baseURL}/api/player`)
      ).json();
      expect(normal.isAdminMode).toBe(false);
      expect(normal.state.stars).toBe(0);
      await page.goto(baseURL);
      expect(
        await page
          .getByRole("button", {
            name: "Ocean Explorers, unlocks at 20 stars",
            exact: true,
          })
          .isDisabled(),
      ).toBe(true);
    } finally {
      await context.close();
    }
  }, 180000);
});
