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
      const [move] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/player") &&
            response.request().method() === "POST",
        ),
        board.getByRole("button", { name: target!, exact: true }).click(),
      ]);
      expect(move.status()).toBe(200);
      const result = await move.json();
      expect(["correct", "won"]).toContain(result.outcome);
      if (result.outcome === "won") {
        await page
          .getByRole("dialog", { name: "Biiig bingo moment!" })
          .waitFor();
        break;
      }
      await page.waitForFunction((previousWord) => {
        const prompt = document.querySelector('[aria-label="Word to find"]');
        return prompt && prompt.textContent !== previousWord;
      }, target);
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
  it("preserves the complete 16:9 scene on a portrait phone without cropping or reflow", async () => {
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
    const scene = page.getByRole("main", { name: "Learning Games adventure" });
    const bounds = await scene.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width / bounds!.height).toBeCloseTo(16 / 9, 2);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeCloseTo((800 - bounds!.height) / 2, 0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(800);
    const boardBounds = await board.boundingBox();
    expect(boardBounds!.x).toBeGreaterThan(bounds!.x);
    expect(boardBounds!.y + boardBounds!.height).toBeLessThan(
      bounds!.y + bounds!.height,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Game options" }).click();
    expect(await page.getByRole("dialog").isVisible()).toBe(true);
    const dialogBounds = await page.getByRole("dialog").boundingBox();
    expect(dialogBounds!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(dialogBounds!.y).toBeGreaterThanOrEqual(bounds!.y);
    expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(
      bounds!.x + bounds!.width + 1,
    );
    expect(dialogBounds!.y + dialogBounds!.height).toBeLessThanOrEqual(
      bounds!.y + bounds!.height + 1,
    );
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    expect(await page.getByRole("dialog").isVisible()).toBe(false);
    await context.close();
  });
  it("keeps the map, collection, and dialogs inside the same landscape scene", async () => {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(baseURL);
      await page.getByRole("button", { name: "Game options" }).waitFor();
      const picker = page.getByRole("region", { name: "Choose a game" });
      expect(
        await picker.getByRole("button", { name: "Let’s play" }).isVisible(),
      ).toBe(true);
      expect(
        await picker
          .getByRole("button", { name: "Play Picture Pairs" })
          .isVisible(),
      ).toBe(true);
      expect(
        await page
          .getByRole("region", { name: "Adventure map", exact: true })
          .count(),
      ).toBe(0);
      await page
        .getByRole("button", {
          name: /YOUR LATEST ADVENTURE.*Jungle.*Explore the map/i,
        })
        .click();
      const map = page.getByRole("region", {
        name: "Adventure map",
        exact: true,
      });
      expect(await map.getByRole("button").count()).toBe(5);
      expect(
        await page
          .getByRole("heading", { name: "A world of discovery!" })
          .isVisible(),
      ).toBe(true);
      await page.getByRole("button", { name: "My stars", exact: true }).click();
      expect(
        await page.getByRole("heading", { name: "My shiny stars" }).isVisible(),
      ).toBe(true);
      expect(
        await page.getByText("stars collected", { exact: true }).isVisible(),
      ).toBe(true);
      await page
        .getByRole("button", { name: "A note for grown-ups", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "A little space to learn" })
        .waitFor();
      const scene = await page
        .getByRole("main", { name: "Learning Games adventure" })
        .boundingBox();
      const dialog = await page.getByRole("dialog").boundingBox();
      expect(scene!.width / scene!.height).toBeCloseTo(16 / 9, 2);
      expect(dialog!.x).toBeGreaterThanOrEqual(scene!.x);
      expect(dialog!.y).toBeGreaterThanOrEqual(scene!.y);
      expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(
        scene!.x + scene!.width + 1,
      );
      expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(
        scene!.y + scene!.height + 1,
      );
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      for (const viewport of [
        { width: 800, height: 450 },
        { width: 1280, height: 600 },
      ]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => {
          const main = document.querySelector("main")!;
          const rect = main.getBoundingClientRect();
          return rect.width <= innerWidth + 1 && rect.height <= innerHeight + 1;
        });
        const resized = await page
          .getByRole("main", { name: "Learning Games adventure" })
          .boundingBox();
        expect(resized!.width / resized!.height).toBeCloseTo(16 / 9, 2);
        expect(resized!.x).toBeCloseTo(
          (viewport.width - resized!.width) / 2,
          0,
        );
        expect(resized!.y).toBeCloseTo(
          (viewport.height - resized!.height) / 2,
          0,
        );
        expect(resized!.y).toBeGreaterThanOrEqual(-1);
        expect(resized!.x + resized!.width).toBeLessThanOrEqual(
          viewport.width + 1,
        );
        expect(resized!.y + resized!.height).toBeLessThanOrEqual(
          viewport.height + 1,
        );
      }
    } finally {
      await context.close();
    }
  });
  it("lets browser zoom enlarge the whole scene and preserves that scale when entering a game", async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(baseURL);
      await page
        .getByRole("article")
        .getByRole("button", { name: "Let’s play" })
        .waitFor();
      await page.waitForFunction(() => {
        const settings = document.querySelector<HTMLButtonElement>(
          '[aria-label="Game options"]',
        );
        return settings && !settings.disabled;
      });
      const scene = page.getByRole("main", {
        name: "Learning Games adventure",
      });
      const original = (await scene.boundingBox())!;
      const session = await context.newCDPSession(page);
      await session.send("Emulation.setDeviceMetricsOverride", {
        width: 640,
        height: 450,
        deviceScaleFactor: 2,
        mobile: false,
      });
      await page.waitForFunction(
        () => devicePixelRatio === 2 && innerWidth === 640,
      );
      const zoomed = (await scene.boundingBox())!;
      expect(zoomed.width).toBeCloseTo(original.width, 0);
      expect(zoomed.height).toBeCloseTo(original.height, 0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("article")
        .getByRole("button", { name: "Let’s play" })
        .click();
      await page
        .getByRole("group", { name: "Word board, five rows and five columns" })
        .waitFor();
      const game = (await page
        .getByRole("main", { name: "Learning Games adventure" })
        .boundingBox())!;
      expect(game.width).toBeCloseTo(original.width, 0);
      expect(game.height).toBeCloseTo(original.height, 0);
      await session.send("Emulation.setDeviceMetricsOverride", {
        width: 2560,
        height: 1800,
        deviceScaleFactor: 0.5,
        mobile: false,
      });
      await page.waitForFunction(
        () => devicePixelRatio === 0.5 && innerWidth === 2560,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      const zoomedOut = (await page
        .getByRole("main", { name: "Learning Games adventure" })
        .boundingBox())!;
      expect(zoomedOut.width).toBeCloseTo(original.width, 0);
      expect(zoomedOut.height).toBeCloseTo(original.height, 0);
      expect(zoomedOut.x).toBeCloseTo((2560 - zoomedOut.width) / 2, 0);
      expect(zoomedOut.y).toBeCloseTo((1800 - zoomedOut.height) / 2, 0);
      await session.send("Emulation.clearDeviceMetricsOverride");
      await page.setViewportSize({ width: 900, height: 600 });
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector("main")!.getBoundingClientRect().width - 900,
          ) < 1,
      );
      const restored = (await page
        .getByRole("main", { name: "Learning Games adventure" })
        .boundingBox())!;
      expect(restored.width).toBeCloseTo(900, 0);
      expect(restored.width / restored.height).toBeCloseTo(16 / 9, 2);
    } finally {
      await context.close();
    }
  });
});
