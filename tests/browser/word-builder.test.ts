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
describe("Word Builder", () => {
  it("lets a child hear clues, recover their progress, and earn a star for five words", async () => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/word-builder`);
      await page.getByRole("button", { name: "Let’s play" }).click();
      await page.getByRole("button", { name: "Hear the word" }).click();
      const source = (await page
        .getByRole("button", { name: "Add f" })
        .boundingBox())!;
      const destination = (await page.getByLabel("Your word").boundingBox())!;
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        destination.x + destination.width / 2,
        destination.y + destination.height / 2,
        { steps: 5 },
      );
      await page.mouse.up();
      await page
        .getByRole("button", { name: "Remove f from position 1" })
        .waitFor();
      await page.keyboard.press("Backspace");
      expect(
        await page.getByRole("button", { name: "Add f" }).isEnabled(),
      ).toBe(true);
      await page.keyboard.type("fox");
      await page.keyboard.press("Delete");
      expect(
        await page.getByRole("button", { name: "Add x" }).isEnabled(),
      ).toBe(true);
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      const words = ["fox", "crab", "fish", "frog", "boat"];
      for (let index = 0; index < words.length; index++) {
        if (index === 0) {
          await page.keyboard.type(words[index]);
          await page.keyboard.press("Enter");
        } else {
          for (const letter of words[index])
            await page.getByRole("button", { name: `Add ${letter}` }).click();
          await page.getByRole("button", { name: "Check my word" }).click();
        }
        if (index === 0) {
          await page.getByText("WORD 2 OF 5").waitFor();
          await page.reload();
          await page.getByText("WORD 2 OF 5").waitFor();
        } else if (index < words.length - 1)
          await page.getByText(`WORD ${index + 2} OF 5`).waitFor();
      }
      await page
        .getByRole("heading", { name: "You built all five words!" })
        .waitFor();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: "You built all five words!" })
        .waitFor();
      await page.getByRole("button", { name: "Play again" }).click();
      await page.getByText("WORD 1 OF 5").waitFor();
    } finally {
      await context.close();
    }
  }, 60000);
  it("drags a letter into the word with touch", async () => {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/word-builder`);
      await page.getByRole("button", { name: "Let’s play" }).click();
      const source = (await page
        .getByRole("button", { name: "Add f" })
        .boundingBox())!;
      const destination = (await page.getByLabel("Your word").boundingBox())!;
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: source.x + source.width / 2, y: source.y + source.height / 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: destination.x + destination.width / 2,
            y: destination.y + destination.height / 2,
          },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page
        .getByRole("button", { name: "Remove f from position 1" })
        .waitFor();
    } finally {
      await context.close();
    }
  }, 30000);
});
