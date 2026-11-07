import { z } from "zod";
import { activitySessionSchema, type ActivitySession } from "../games/activity";
import { sessionSchema, type BingoSession } from "../games/bingo";
import { matchingSessionSchema, type MatchingSession } from "../games/matching";
import { gameOptionsSchema, defaultOptions } from "../games/options";

export const resultSchema = z.object({
  sessionId: z.string(),
  gameId: z.string(),
  worldId: z.string(),
  points: z.number(),
  completedAt: z.number(),
});
export const playerStateSchema = z.object({
  version: z.literal(1),
  stars: z.number().int().min(0),
  points: z.number().int().min(0),
  options: gameOptionsSchema,
  session: sessionSchema.nullable(),
  matchingSession: matchingSessionSchema.nullable().default(null),
  activitySessions: z.array(activitySessionSchema).default([]),
  results: z.array(resultSchema),
});
export type PlayerState = z.infer<typeof playerStateSchema>;
export function createPlayerState(): PlayerState {
  return {
    version: 1,
    stars: 0,
    points: 0,
    options: defaultOptions,
    session: null,
    matchingSession: null,
    activitySessions: [],
    results: [],
  };
}
export function awardCompletion(
  state: PlayerState,
  session: BingoSession,
): PlayerState {
  if (
    session.phase !== "won" ||
    state.results.some((result) => result.sessionId === session.id)
  )
    return { ...state, session };
  const points = session.marked.length * 10 + 50;
  return {
    ...state,
    session,
    stars: state.stars + 1,
    points: state.points + points,
    results: [
      ...state.results,
      {
        sessionId: session.id,
        gameId: session.gameId,
        worldId: session.worldId,
        points,
        completedAt: session.completedAt!,
      },
    ].slice(-100),
  };
}

export function awardMatchingCompletion(
  state: PlayerState,
  session: MatchingSession,
): PlayerState {
  if (
    session.phase !== "won" ||
    state.results.some((result) => result.sessionId === session.id)
  )
    return { ...state, matchingSession: session };
  const points = 100;
  return {
    ...state,
    matchingSession: session,
    stars: state.stars + 1,
    points: state.points + points,
    results: [
      ...state.results,
      {
        sessionId: session.id,
        gameId: session.gameId,
        worldId: session.worldId,
        points,
        completedAt: session.completedAt!,
      },
    ].slice(-100),
  };
}

export function saveActivitySession(
  state: PlayerState,
  session: ActivitySession,
): PlayerState {
  const activitySessions = [
    ...state.activitySessions.filter((item) => item.gameId !== session.gameId),
    session,
  ];
  if (
    session.phase !== "won" ||
    state.results.some((item) => item.sessionId === session.id)
  )
    return { ...state, activitySessions };
  const points = session.gameId === "math-drops" ? 80 : 100;
  return {
    ...state,
    activitySessions,
    stars: state.stars + 1,
    points: state.points + points,
    results: [
      ...state.results,
      {
        sessionId: session.id,
        gameId: session.gameId,
        worldId: session.worldId,
        points,
        completedAt: session.completedAt!,
      },
    ].slice(-100),
  };
}
