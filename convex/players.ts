import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  createPlayerState,
  awardCompletion,
  awardMatchingCompletion,
  playerStateSchema,
} from "../src/lib/platform/progress";
import { commandSchema } from "../src/lib/platform/commands";
import { applyBingoMove, createBingoSession } from "../src/lib/games/bingo";
import {
  clearMatchingCards,
  createMatchingSession,
  flipMatchingCard,
} from "../src/lib/games/matching";
import { isWorldUnlocked } from "../src/lib/games/worlds";

function authorize(secret: string) {
  if (
    !process.env.GAME_SERVER_SECRET ||
    secret !== process.env.GAME_SERVER_SECRET
  )
    throw new Error("Unauthorized");
}
export const load = query({
  args: { secret: v.string(), keyHash: v.string() },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const player = await ctx.db
      .query("players")
      .withIndex("by_key", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    return player?.state ?? createPlayerState();
  },
});
export const command = mutation({
  args: {
    secret: v.string(),
    keyHash: v.string(),
    command: v.string(),
    sessionId: v.string(),
    hasAdminAccess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const input = commandSchema.parse(JSON.parse(args.command));
    const player = await ctx.db
      .query("players")
      .withIndex("by_key", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    let state = playerStateSchema.parse(player?.state ?? createPlayerState());
    let outcome: "correct" | "incorrect" | "won" | "ignored" | null = null;
    if (input.kind === "options") state = { ...state, options: input.options };
    if (input.kind === "start") {
      if (!args.hasAdminAccess && !isWorldUnlocked(input.worldId, state.stars))
        throw new Error("World locked");
      state = {
        ...state,
        options: input.options,
        session: createBingoSession(
          args.sessionId,
          input.worldId,
          input.options,
        ),
      };
    }
    if (input.kind === "move") {
      if (
        !state.session ||
        state.session.id !== input.sessionId ||
        state.session.revision !== input.expectedRevision
      )
        return { state, outcome: "ignored" as const };
      const result = applyBingoMove(state.session, input.word);
      state = awardCompletion(state, result.session);
      outcome = result.outcome;
    }
    if (input.kind === "matching-start") {
      if (!args.hasAdminAccess && !isWorldUnlocked(input.worldId, state.stars))
        throw new Error("World locked");
      state = {
        ...state,
        matchingSession: createMatchingSession(
          args.sessionId,
          input.worldId,
          Math.random,
          Date.now(),
          input.pairCount,
        ),
      };
    }
    if (input.kind === "matching-flip" || input.kind === "matching-clear") {
      const session = state.matchingSession;
      if (
        !session ||
        session.id !== input.sessionId ||
        session.revision !== input.expectedRevision
      )
        return { state, outcome: "ignored" as const };
      if (input.kind === "matching-flip") {
        const move = flipMatchingCard(session, input.index);
        if (move.outcome === "ignored")
          return { state, outcome: "ignored" as const };
        state = awardMatchingCompletion(state, move.session);
        outcome = move.outcome === "flip" ? null : move.outcome;
      } else state = { ...state, matchingSession: clearMatchingCards(session) };
    }
    if (player) await ctx.db.patch(player._id, { state });
    else await ctx.db.insert("players", { keyHash: args.keyHash, state });
    return { state, outcome };
  },
});
