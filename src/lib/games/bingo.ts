import { z } from "zod";
import { gameOptionsSchema, type GameOptions } from "./options";

export const wordCollections = {
  starter: [
    "cat",
    "dog",
    "sun",
    "hat",
    "pig",
    "bus",
    "cup",
    "bed",
    "fox",
    "hen",
    "pen",
    "box",
    "red",
    "big",
    "run",
    "sit",
    "hop",
    "map",
    "bug",
    "pot",
    "bat",
    "net",
    "log",
    "fan",
    "jam",
    "van",
    "wet",
    "top",
    "leg",
    "mud",
  ],
  sight: [
    "the",
    "and",
    "you",
    "see",
    "can",
    "we",
    "go",
    "to",
    "my",
    "me",
    "up",
    "in",
    "it",
    "is",
    "on",
    "at",
    "he",
    "she",
    "look",
    "like",
    "play",
    "come",
    "here",
    "said",
    "was",
    "for",
    "are",
    "all",
    "with",
    "they",
  ],
};
export const sessionSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  gameId: z.literal("word-bingo"),
  worldId: z.string(),
  options: gameOptionsSchema,
  board: z.array(z.string()).length(25),
  order: z.array(z.string()).length(25),
  marked: z.array(z.string()),
  cursor: z.number().int().min(0).max(25),
  phase: z.enum(["playing", "won"]),
  revision: z.number().int().min(0),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
});
export type BingoSession = z.infer<typeof sessionSchema>;
export type MoveResult = {
  session: BingoSession;
  outcome: "correct" | "incorrect" | "won" | "ignored";
};

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
export function createBingoSession(
  id: string,
  worldId: string,
  options: GameOptions,
  random: () => number = Math.random,
  now = Date.now(),
): BingoSession {
  const board = shuffle(wordCollections[options.wordSet], random).slice(0, 25);
  return {
    version: 1,
    id,
    gameId: "word-bingo",
    worldId,
    options,
    board,
    order: shuffle(board, random),
    marked: [],
    cursor: 0,
    phase: "playing",
    revision: 0,
    createdAt: now,
    completedAt: null,
  };
}
export function getWinningLine(
  board: string[],
  marked: string[],
): number[] | null {
  const marks = new Set(marked);
  const lines: number[][] = [];
  for (let index = 0; index < 5; index++) {
    lines.push(Array.from({ length: 5 }, (_, column) => index * 5 + column));
    lines.push(Array.from({ length: 5 }, (_, row) => row * 5 + index));
  }
  lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return (
    lines.find((line) => line.every((index) => marks.has(board[index]))) ?? null
  );
}
export function applyBingoMove(
  session: BingoSession,
  word: string,
  now = Date.now(),
): MoveResult {
  if (session.phase !== "playing" || session.marked.includes(word))
    return { session, outcome: "ignored" };
  if (word !== session.order[session.cursor])
    return { session, outcome: "incorrect" };
  const marked = [...session.marked, word];
  const hasWon = getWinningLine(session.board, marked) !== null;
  return {
    outcome: hasWon ? "won" : "correct",
    session: {
      ...session,
      marked,
      cursor: session.cursor + 1,
      revision: session.revision + 1,
      phase: hasWon ? "won" : "playing",
      completedAt: hasWon ? now : null,
    },
  };
}
