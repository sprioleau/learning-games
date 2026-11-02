import { z } from "zod";
import { shuffle } from "./bingo";
export const matchingFaces = [
  "jungle",
  "desert",
  "arctic",
  "city",
  "ocean",
  "one-star",
  "two-stars",
  "three-stars",
  "four-stars",
  "five-stars",
] as const;
export const matchingSessionSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  gameId: z.literal("card-matching"),
  worldId: z.string(),
  board: z.array(z.string()).length(20),
  revealed: z.array(z.number().int()),
  matched: z.array(z.number().int()),
  moves: z.number().int().min(0),
  revision: z.number().int().min(0),
  phase: z.enum(["playing", "won"]),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
});
export type MatchingSession = z.infer<typeof matchingSessionSchema>;
export type MatchingOutcome =
  "flip" | "correct" | "incorrect" | "won" | "ignored";
export function createMatchingSession(
  id: string,
  worldId: string,
  random: () => number = Math.random,
  now = Date.now(),
): MatchingSession {
  return {
    version: 1,
    id,
    gameId: "card-matching",
    worldId,
    board: shuffle([...matchingFaces, ...matchingFaces], random),
    revealed: [],
    matched: [],
    moves: 0,
    revision: 0,
    phase: "playing",
    createdAt: now,
    completedAt: null,
  };
}
export function flipMatchingCard(
  session: MatchingSession,
  index: number,
  now = Date.now(),
): { session: MatchingSession; outcome: MatchingOutcome } {
  if (
    session.phase !== "playing" ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 20 ||
    session.revealed.length === 2 ||
    session.revealed.includes(index) ||
    session.matched.includes(index)
  )
    return { session, outcome: "ignored" };
  const revealed = [...session.revealed, index];
  const isPair = revealed.length === 2;
  const isMatch = isPair && session.board[revealed[0]] === session.board[index];
  const matched = isMatch ? [...session.matched, ...revealed] : session.matched;
  const hasWon = matched.length === 20;
  return {
    session: {
      ...session,
      revealed: isMatch ? [] : revealed,
      matched,
      moves: session.moves + (isPair ? 1 : 0),
      revision: session.revision + 1,
      phase: hasWon ? "won" : "playing",
      completedAt: hasWon ? now : null,
    },
    outcome: hasWon
      ? "won"
      : isMatch
        ? "correct"
        : isPair
          ? "incorrect"
          : "flip",
  };
}
export function clearMatchingCards(session: MatchingSession): MatchingSession {
  if (session.phase !== "playing" || session.revealed.length !== 2)
    return session;
  return { ...session, revealed: [], revision: session.revision + 1 };
}
