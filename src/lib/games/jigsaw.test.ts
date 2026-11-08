import { describe, expect, it } from "vitest";
import {
  createPuzzlePieces,
  getPieceEdges,
  getPieceTarget,
  getSavedPuzzleScene,
  puzzleScenes,
  isNearPieceTarget,
  puzzleBoard,
  puzzleSizes,
} from "./jigsaw";

describe("jigsaw pieces", () => {
  it.each(puzzleSizes)("creates all pieces for $label in one tray", (size) => {
    const pieces = createPuzzlePieces(size, () => 0.5);
    expect(pieces).toHaveLength(size.rows * size.columns);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(pieces.length);
    expect(pieces.every((piece) => Math.abs(piece.rotation) <= 8)).toBe(true);
  });
  it.each(puzzleSizes)(
    "makes every neighboring edge complementary for $label",
    (size) => {
      for (let row = 0; row < size.rows; row++)
        for (let column = 0; column < size.columns; column++) {
          const edges = getPieceEdges(row, column, size);
          if (row === 0) expect(edges.top).toBe(0);
          if (column === 0) expect(edges.left).toBe(0);
          if (row + 1 < size.rows)
            expect(edges.bottom).toBe(
              -getPieceEdges(row + 1, column, size).top,
            );
          if (column + 1 < size.columns)
            expect(edges.right).toBe(
              -getPieceEdges(row, column + 1, size).left,
            );
        }
    },
  );
  it("snaps only close to the correct piece's destination", () => {
    const size = puzzleSizes[1];
    const piece = createPuzzlePieces(size)[0];
    const target = getPieceTarget(piece, size);
    expect(isNearPieceTarget({ ...piece, ...target }, size)).toBe(true);
    expect(
      isNearPieceTarget(
        {
          ...piece,
          x: target.x + puzzleBoard.size / size.columns,
          y: target.y,
        },
        size,
      ),
    ).toBe(false);
  });
});

describe("puzzle picture collection", () => {
  it("offers three distinct pictures per world", () => {
    for (const world of ["jungle", "desert", "arctic", "city", "ocean"]) {
      const scenes = puzzleScenes.filter((scene) => scene.worldId === world);
      expect(scenes).toHaveLength(3);
      expect(new Set(scenes.map((scene) => scene.image)).size).toBe(3);
    }
  });
  it("restores the selected scene and falls back for older saves", () => {
    expect(getSavedPuzzleScene("ocean", '{"sceneIndex":2}').id).toBe("ocean-2");
    expect(getSavedPuzzleScene("jungle", "{}").id).toBe("jungle-0");
    expect(getSavedPuzzleScene("jungle", "bad data").id).toBe("jungle-0");
  });
});
