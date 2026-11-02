import { describe, expect, it } from "vitest";
import {
  createMatchingSession,
  flipMatchingCard,
  clearMatchingCards,
} from "./matching";
import {
  awardMatchingCompletion,
  createPlayerState,
} from "../platform/progress";

describe("picture matching rules", () => {
  it("creates ten distinct pairs in a twenty-card deck", () => {
    const session = createMatchingSession("game", "jungle");
    expect(session.board).toHaveLength(20);
    expect(new Set(session.board).size).toBe(10);
    for (const face of session.board)
      expect(session.board.filter((item) => item === face)).toHaveLength(2);
  });
  it("rejects flipping a card twice and holds mismatches until they are cleared", () => {
    const session = createMatchingSession("game", "jungle");
    const first = flipMatchingCard(session, 0);
    expect(flipMatchingCard(first.session, 0).outcome).toBe("ignored");
    const mismatch = session.board.findIndex(
      (face) => face !== session.board[0],
    );
    const second = flipMatchingCard(first.session, mismatch);
    expect(second.outcome).toBe("incorrect");
    expect(second.session.revealed).toEqual([0, mismatch]);
    expect(flipMatchingCard(second.session, 1).outcome).toBe("ignored");
    expect(clearMatchingCards(second.session).revealed).toEqual([]);
  });
  it("keeps matched cards visible and awards one star and 100 points only once, preserving bingo progress", () => {
    let session = createMatchingSession("game", "jungle");
    for (const face of new Set(session.board)) {
      const pair = session.board.flatMap((item, index) =>
        item === face ? [index] : [],
      );
      session = flipMatchingCard(session, pair[0]).session;
      session = flipMatchingCard(session, pair[1], 12345).session;
    }
    expect(session.phase).toBe("won");
    expect(session.matched).toHaveLength(20);
    const initial = createPlayerState();
    initial.points = 25;
    const saved = awardMatchingCompletion(initial, session);
    expect(saved.stars).toBe(1);
    expect(saved.points).toBe(125);
    expect(awardMatchingCompletion(saved, session)).toEqual(saved);
  });
});
