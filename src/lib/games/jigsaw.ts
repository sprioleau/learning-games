import { worlds, type WorldId } from "./worlds";

export const puzzleScenes = worlds.flatMap((world) =>
  [0, 1, 2].map((index) => ({
    id: `${world.id}-${index}`,
    worldId: world.id,
    index,
    name: `${world.shortName} ${["Adventure", "Friends", "Discovery"][index]}`,
    image:
      world.id === "jungle" && index === 0
        ? "/assets/puzzles/jungle-explorer.webp"
        : `/assets/puzzles/${world.id}-${index}.webp`,
  })),
);
export function getPuzzleScene(worldId: string, index: number) {
  return (
    puzzleScenes.find(
      (scene) => scene.worldId === worldId && scene.index === index,
    ) ?? puzzleScenes[0]
  );
}
export function getSavedPuzzleScene(worldId: string, payload: string) {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "sceneIndex" in parsed &&
      typeof parsed.sceneIndex === "number"
    )
      return getPuzzleScene(worldId, parsed.sceneIndex);
  } catch {
    /* Older or damaged saves fall back to the first picture. */
  }
  return getPuzzleScene(worldId as WorldId, 0);
}
export const puzzleSizes = [
  { id: "3x3", label: "9 pieces", rows: 3, columns: 3 },
  { id: "4x5", label: "20 pieces", rows: 4, columns: 5 },
  { id: "7x7", label: "49 pieces", rows: 7, columns: 7 },
  { id: "7x8", label: "56 pieces", rows: 7, columns: 8 },
] as const;
export type PuzzleSize = (typeof puzzleSizes)[number];
export type PuzzlePiece = {
  id: number;
  row: number;
  column: number;
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
};
export const puzzleBoard = { x: 55, y: 70, size: 390 } as const;
export const puzzleCanvas = { width: 1200, height: 520 } as const;
export const puzzleTray = { x: 480, y: 55, width: 685, height: 410 } as const;
export function getPieceTarget(piece: PuzzlePiece, size: PuzzleSize) {
  return {
    x: puzzleBoard.x + (piece.column * puzzleBoard.size) / size.columns,
    y: puzzleBoard.y + (piece.row * puzzleBoard.size) / size.rows,
  };
}
export function isNearPieceTarget(piece: PuzzlePiece, size: PuzzleSize) {
  const target = getPieceTarget(piece, size);
  const threshold =
    Math.min(puzzleBoard.size / size.columns, puzzleBoard.size / size.rows) *
    0.3;
  return Math.hypot(piece.x - target.x, piece.y - target.y) <= threshold;
}
export function createPuzzlePieces(
  size: PuzzleSize,
  random: () => number = Math.random,
): PuzzlePiece[] {
  const pieces = Array.from({ length: size.rows * size.columns }, (_, id) => ({
    id,
    row: Math.floor(id / size.columns),
    column: id % size.columns,
    x: 0,
    y: 0,
    rotation: 0,
    isPlaced: false,
  }));
  for (let index = pieces.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pieces[index], pieces[other]] = [pieces[other], pieces[index]];
  }
  const columns = size.columns;
  const rows = size.rows;
  const cellWidth = puzzleTray.width / columns;
  const cellHeight = puzzleTray.height / rows;
  const pieceWidth = puzzleBoard.size / size.columns;
  const pieceHeight = puzzleBoard.size / size.rows;
  pieces.forEach((piece, index) => {
    piece.x =
      puzzleTray.x +
      ((index % columns) + 0.5) * cellWidth -
      pieceWidth / 2 +
      (random() - 0.5) * Math.min(12, cellWidth * 0.1);
    piece.y =
      puzzleTray.y +
      (Math.floor(index / columns) + 0.5) * cellHeight -
      pieceHeight / 2 +
      (random() - 0.5) * Math.min(10, cellHeight * 0.1);
    piece.rotation = (random() - 0.5) * 16;
  });
  return pieces;
}
function edgeSign(row: number, column: number, axis: number) {
  return ((row * 17 + column * 31 + axis * 11) % 2) * 2 - 1;
}
export function getPieceEdges(row: number, column: number, size: PuzzleSize) {
  return {
    top: row === 0 ? 0 : -edgeSign(row - 1, column, 1),
    right: column === size.columns - 1 ? 0 : edgeSign(row, column, 0),
    bottom: row === size.rows - 1 ? 0 : edgeSign(row, column, 1),
    left: column === 0 ? 0 : -edgeSign(row, column - 1, 0),
  };
}
