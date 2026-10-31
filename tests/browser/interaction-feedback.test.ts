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
describe("immediate interaction feedback", () => {
  it("marks and advances a correct answer while its save request is still held", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    let releaseSave: () => void = () => undefined;
    let announceSave: () => void = () => undefined;
    const heldSave = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const saveStarted = new Promise<void>((resolve) => {
      announceSave = resolve;
    });
    try {
      await page.goto(baseURL);
      await page.getByRole("button", { name: "Game options" }).click();
      await page.getByRole("switch", { name: /Show the spoken word/ }).check();
      await page.getByRole("button", { name: "Save settings" }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page
        .getByRole("article")
        .getByRole("button", { name: "Let’s play" })
        .click();
      const prompt = page.getByLabel("Word to find", { exact: true });
      const word = (await prompt.textContent())!;
      await page.route("**/api/player", async (route) => {
        if (
          route.request().method() === "POST" &&
          route.request().postDataJSON()?.kind === "move"
        ) {
          announceSave();
          await heldSave;
        }
        await route.continue();
      });
      const board = page.getByRole("group", {
        name: "Word board, five rows and five columns",
      });
      await board.getByRole("button", { name: word, exact: true }).click();
      await saveStarted;
      await board
        .getByRole("button", { name: word, exact: true, pressed: true })
        .waitFor({ timeout: 1000 });
      expect(await prompt.textContent()).not.toBe(word);
      expect(
        await page
          .getByRole("button", { name: "Hear the word again" })
          .isEnabled(),
      ).toBe(true);
      releaseSave();
      await page
        .getByRole("button", { name: "New board" })
        .waitFor({ state: "visible" });
    } finally {
      releaseSave();
      await context.close();
    }
  });
  it("keeps the close button stationary and usable while settings content scrolls", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(baseURL);
      await page.getByRole("button", { name: "Game options" }).click();
      const dialog = page.getByRole("dialog");
      const close = dialog.getByRole("button", { name: "Close", exact: true });
      const initial = (await close.boundingBox())!;
      const content = dialog.getByRole("region", { name: "Dialog content" });
      await content.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect(
        await content.evaluate((element) => element.scrollTop),
      ).toBeGreaterThan(0);
      const after = (await close.boundingBox())!;
      expect(after.y).toBeCloseTo(initial.y, 1);
      expect(after.x).toBeCloseTo(initial.x, 1);
      await close.click();
      await dialog.waitFor({ state: "hidden" });
    } finally {
      await context.close();
    }
  });
});
