import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
let browser: Browser;
const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});
describe("a complete learning adventure", () => {
  it("plays through Convex, retries a mistake, replays speech, wins once, and restores the saved reward", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const spoken: string[] = [];
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices() {
            return [];
          },
          cancel() {},
          speak(utterance: SpeechSynthesisUtterance) {
            spoken.push(utterance.text);
          },
        },
      });
      Object.defineProperty(window, "spokenWords", { value: spoken });
    });
    await page.goto(baseURL);
    const play = page
      .getByRole("article")
      .getByRole("button", { name: "Let’s play" });
    await play.waitFor();
    await page.getByRole("button", { name: "Game options" }).click();
    await page.getByRole("switch", { name: /Show the spoken word/ }).check();
    await page
      .getByRole("switch", { name: /Celebration animations/ })
      .uncheck();
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await play.click();
    await page.getByLabel("Word to find", { exact: true }).waitFor();
    const firstWord = (await page
      .getByLabel("Word to find", { exact: true })
      .textContent())!;
    await page.getByRole("button", { name: "Hear the word again" }).click();
    const spoken = await page.evaluate(
      () => (window as unknown as { spokenWords: string[] }).spokenWords,
    );
    expect(spoken.at(-1)).toBe(firstWord);
    const board = page.getByLabel("Word board, five rows and five columns");
    const words = await board.getByRole("button").allTextContents();
    const wrongWord = words.find((word) => word !== firstWord)!;
    await board.getByRole("button", { name: wrongWord, exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Good try!" }).waitFor();
    expect(
      await page.getByLabel("Word to find", { exact: true }).textContent(),
    ).toBe(firstWord);
    await board.getByRole("button", { name: firstWord, exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: `You found ${firstWord}` })
      .waitFor();
    await page.reload();
    await board.getByRole("button", { name: firstWord, exact: true }).waitFor();
    expect(
      await board
        .getByRole("button", { name: firstWord, exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((issue) => ({
        id: issue.id,
        description: issue.description,
        nodes: issue.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    for (let turn = 0; turn < 25; turn++) {
      if (await page.getByRole("dialog").isVisible()) break;
      const target = await page
        .getByLabel("Word to find", { exact: true })
        .textContent();
      const move = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/player") &&
          response.request().method() === "POST",
      );
      await board.getByRole("button", { name: target!, exact: true }).click();
      expect((await move).status()).toBe(200);
    }
    await page.getByRole("dialog", { name: "Biiig bingo moment!" }).waitFor();
    expect(await page.getByText("+1 star", { exact: true }).isVisible()).toBe(
      true,
    );
    await page.reload();
    await page.getByLabel("1 star", { exact: true }).waitFor();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Back to my adventure" })
      .click();
    await page.getByRole("button", { name: "My stars" }).click();
    expect(
      await page.getByText("stars collected", { exact: true }).isVisible(),
    ).toBe(true);
    expect(await page.getByRole("listitem").count()).toBe(1);
    expect(errors).toEqual([]);
    await context.close();
  });
  it("keeps a 5×5 board usable on a small phone without horizontal scrolling", async () => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(baseURL);
    const hubAudit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      hubAudit.violations.map((issue) => ({
        id: issue.id,
        nodes: issue.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    await page
      .getByRole("article")
      .getByRole("button", { name: "Let’s play" })
      .click();
    const board = page.getByLabel("Word board, five rows and five columns");
    await board.waitFor();
    expect(await board.getByRole("button").count()).toBe(25);
    const sizes = await board.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => ({
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
      })),
    );
    expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Game options" }).click();
    expect(await page.getByRole("dialog").isVisible()).toBe(true);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    expect(await page.getByRole("dialog").isVisible()).toBe(false);
    await context.close();
  });
});
