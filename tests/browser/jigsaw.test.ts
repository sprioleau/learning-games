import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import {
  createPuzzlePieces,
  getPieceTarget,
  puzzleBoard,
  puzzleCanvas,
  puzzleSizes,
} from "../../src/lib/games/jigsaw";
let browser: Browser;
const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});
describe("Jungle Jigsaw", () => {
  it("opens the box, snaps a dragged piece and completes the puzzle with keyboard controls", async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/play/jigsaw`);
      await page.waitForFunction(
        () =>
          !document.querySelector<HTMLButtonElement>(
            '[aria-label="Game options"]',
          )?.disabled,
      );
      await page.evaluate(() => {
        Math.random = () => 0.5;
      });
      await page.getByRole("button", { name: "Jungle Friends" }).click();
      await page.getByRole("button", { name: "Open puzzle box" }).click();
      const canvas = page.getByRole("img", {
        name: "Jungle puzzle board and scattered pieces",
      });
      await canvas.waitFor();
      const bounds = (await canvas.boundingBox())!;
      const size = puzzleSizes[0];
      const piece = createPuzzlePieces(size, () => 0.5)[0];
      const target = getPieceTarget(piece, size);
      const half = puzzleBoard.size / size.columns / 2;
      function px(x: number) {
        return bounds.x + (x * bounds.width) / puzzleCanvas.width;
      }
      function py(y: number) {
        return bounds.y + (y * bounds.height) / puzzleCanvas.height;
      }
      await page.mouse.move(px(piece.x + half), py(piece.y + half));
      await page.mouse.down();
      await page.mouse.move(px(target.x + half), py(target.y + half), {
        steps: 8,
      });
      await page.mouse.up();
      await page
        .getByRole("status")
        .filter({ hasText: "A piece found its place!" })
        .waitFor();
      expect(await page.getByText("1 / 9 pieces").isVisible()).toBe(true);
      await page.reload();
      await page.getByText("1 / 9 pieces").waitFor();
      await page.getByRole("button", { name: "New puzzle" }).click();
      expect(
        await page
          .getByRole("button", { name: "Jungle Friends" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
      await page.reload();
      await page.getByText("1 / 9 pieces").waitFor();
      await page.getByRole("button", { name: "Keyboard controls" }).click();
      const controls = page.getByRole("region", {
        name: "Place a puzzle piece",
      });
      for (let id = 0; id < 9; id++) {
        if (id === piece.id) continue;
        await controls
          .getByLabel("Piece", { exact: true })
          .selectOption(String(id));
        await controls
          .getByLabel("Row", { exact: true })
          .selectOption(String(Math.floor(id / 3) + 1));
        await controls
          .getByLabel("Column", { exact: true })
          .selectOption(String((id % 3) + 1));
        await controls.getByRole("button", { name: "Place piece" }).click();
      }
      await page.getByRole("heading", { name: "Picture complete!" }).waitFor();
      await page.getByLabel("1 star", { exact: true }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: "Picture complete!" }).waitFor();
    } finally {
      await context.close();
    }
  }, 60000);
  it("shows all 56 pieces without paging", async () => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    try {
      await page.goto(`${baseURL}/play/jigsaw`);
      await page.getByRole("button", { name: "56 pieces" }).click();
      await page.evaluate(() => {
        Math.random = () => 0.9;
      });
      await page.getByRole("button", { name: "Open puzzle box" }).click();
      await page.getByText("0 / 56 pieces").waitFor();
      expect(
        await page.getByRole("button", { name: "More pieces" }).count(),
      ).toBe(0);
      const canvas = page.getByRole("img", {
        name: "Jungle puzzle board and scattered pieces",
      });
      const bounds = (await canvas.boundingBox())!;
      const size = puzzleSizes[3];
      const piece = createPuzzlePieces(size, () => 0.9)[0];
      const target = getPieceTarget(piece, size);
      const halfWidth = puzzleBoard.size / size.columns / 2;
      const halfHeight = puzzleBoard.size / size.rows / 2;
      function px(x: number) {
        return bounds.x + (x * bounds.width) / puzzleCanvas.width;
      }
      function py(y: number) {
        return bounds.y + (y * bounds.height) / puzzleCanvas.height;
      }
      await page.mouse.move(px(piece.x + halfWidth), py(piece.y + halfHeight));
      await page.mouse.down();
      await page.mouse.move(
        px(target.x + halfWidth),
        py(target.y + halfHeight),
        { steps: 8 },
      );
      await page.mouse.up();
      await page.getByText("1 / 56 pieces").waitFor();
      await page.getByRole("button", { name: "Keyboard controls" }).click();
      expect(
        await page
          .getByLabel("Piece", { exact: true })
          .locator("option")
          .count(),
      ).toBe(56);
    } finally {
      await page.close();
    }
  }, 60000);
});
