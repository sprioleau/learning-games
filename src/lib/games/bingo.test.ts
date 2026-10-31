import { describe, expect, it } from "vitest";
import {
  applyBingoMove,
  createBingoSession,
  getWinningLine,
  type BingoSession,
} from "./bingo";
import { defaultOptions, gameOptionsSchema } from "./options";
import { awardCompletion, createPlayerState } from "../platform/progress";
import { isWorldUnlocked } from "./worlds";
function makeBoard(): BingoSession {
  const session = createBingoSession(
    "test-session",
    "jungle",
    defaultOptions,
    () => 0.5,
    1000,
  );
  return { ...session, order: [...session.board] };
}
describe("Word Bingo rules", () => {
  it("creates 25 distinct playable cells with exactly one spoken turn per word and no free square", () => {
    for (const wordSet of ["starter", "sight"] as const) {
      const session = createBingoSession("game", "jungle", {
        ...defaultOptions,
        wordSet,
      });
      expect(new Set(session.board).size).toBe(25);
      expect([...session.order].sort()).toEqual([...session.board].sort());
      expect(session.marked).toEqual([]);
    }
  });
  it("keeps the same prompt and progress on an incorrect answer", () => {
    const session = makeBoard();
    const result = applyBingoMove(session, session.board[1]);
    expect(result.outcome).toBe("incorrect");
    expect(result.session).toEqual(session);
  });
  it("marks a correct word and advances exactly one prompt without mutating the prior state", () => {
    const session = makeBoard();
    const result = applyBingoMove(session, session.board[0]);
    expect(result.outcome).toBe("correct");
    expect(result.session.marked).toEqual([session.board[0]]);
    expect(result.session.cursor).toBe(1);
    expect(result.session.revision).toBe(1);
    expect(session.marked).toEqual([]);
    expect(applyBingoMove(result.session, session.board[0]).outcome).toBe(
      "ignored",
    );
  });
  const lines = [
    ...Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, column) => row * 5 + column),
    ),
    ...Array.from({ length: 5 }, (_, column) =>
      Array.from({ length: 5 }, (_, row) => row * 5 + column),
    ),
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
  ];
  it.each(lines.map((line, index) => ({ line, index })))(
    "recognizes winning line $index only after all five cells are found",
    ({ line }) => {
      const session = makeBoard();
      const words = line.map((index) => session.board[index]);
      expect(getWinningLine(session.board, words.slice(0, 4))).toBeNull();
      expect(getWinningLine(session.board, words)).toEqual(line);
    },
  );
  it("ends immediately on the fifth word of a winning row and ignores later moves", () => {
    let session = makeBoard();
    for (const word of session.board.slice(0, 5))
      session = applyBingoMove(session, word, 2000).session;
    expect(session.phase).toBe("won");
    expect(session.completedAt).toBe(2000);
    expect(applyBingoMove(session, session.order[5]).outcome).toBe("ignored");
  });
  it("awards a completed game once and never awards an unfinished game", () => {
    const session = makeBoard();
    const initial = createPlayerState();
    expect(awardCompletion(initial, session).stars).toBe(0);
    const won = session.board
      .slice(0, 5)
      .reduce(
        (current, word) => applyBingoMove(current, word, 2000).session,
        session,
      );
    const rewarded = awardCompletion(initial, won);
    expect(rewarded.stars).toBe(1);
    expect(rewarded.points).toBe(100);
    expect(awardCompletion(rewarded, won)).toEqual(rewarded);
  });
  it("unlocks each subsequent world after five more stars", () => {
    expect(isWorldUnlocked("jungle", 0)).toBe(true);
    for (const [id, required] of [
      ["desert", 5],
      ["arctic", 10],
      ["city", 15],
      ["ocean", 20],
    ] as const) {
      expect(isWorldUnlocked(id, required - 1)).toBe(false);
      expect(isWorldUnlocked(id, required)).toBe(true);
    }
  });
  it("validates and versions modifiers instead of accepting unsupported rule values", () => {
    expect(gameOptionsSchema.safeParse({ wordSet: "anything" }).success).toBe(
      false,
    );
    expect(gameOptionsSchema.safeParse({ speechRate: 3 }).success).toBe(false);
    expect(gameOptionsSchema.parse({ hasWordHints: true })).toEqual({
      ...defaultOptions,
      hasWordHints: true,
    });
  });
});
