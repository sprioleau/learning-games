import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const optionsValidator = v.object({
  version: v.literal(1),
  wordSet: v.union(v.literal("starter"), v.literal("sight")),
  hasWordHints: v.boolean(),
  isSoundEnabled: v.boolean(),
  isCelebrationEnabled: v.boolean(),
  speechRate: v.union(v.literal("gentle"), v.literal("normal")),
});
export const sessionValidator = v.object({
  version: v.literal(1),
  id: v.string(),
  gameId: v.literal("word-bingo"),
  worldId: v.string(),
  options: optionsValidator,
  board: v.array(v.string()),
  order: v.array(v.string()),
  marked: v.array(v.string()),
  cursor: v.number(),
  phase: v.union(v.literal("playing"), v.literal("won")),
  revision: v.number(),
  createdAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
});
export const matchingSessionValidator = v.object({
  version: v.literal(1),
  id: v.string(),
  gameId: v.literal("card-matching"),
  worldId: v.string(),
  board: v.array(v.string()),
  revealed: v.array(v.number()),
  matched: v.array(v.number()),
  moves: v.number(),
  revision: v.number(),
  phase: v.union(v.literal("playing"), v.literal("won")),
  createdAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
});
export const activityAnswerValidator = v.union(
  v.number(),
  v.string(),
  v.array(v.number()),
);
export const activitySessionValidator = v.object({
  id: v.string(),
  gameId: v.union(
    v.literal("number-trail"),
    v.literal("fraction-cafe"),
    v.literal("math-drops"),
    v.literal("word-builder"),
    v.literal("jigsaw"),
  ),
  worldId: v.string(),
  mode: v.union(
    v.literal("addition"),
    v.literal("subtraction"),
    v.literal("mixed"),
    v.literal("multiplication"),
    v.literal("division"),
    v.literal("default"),
    v.literal("3x3"),
    v.literal("4x5"),
    v.literal("7x7"),
    v.literal("7x8"),
  ),
  questions: v.array(
    v.object({
      prompt: v.string(),
      answer: activityAnswerValidator,
      payload: v.string(),
    }),
  ),
  answers: v.array(activityAnswerValidator),
  cursor: v.number(),
  revision: v.number(),
  phase: v.union(v.literal("playing"), v.literal("won")),
  createdAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
});
export default defineSchema({
  players: defineTable({
    keyHash: v.string(),
    state: v.object({
      version: v.literal(1),
      stars: v.number(),
      points: v.number(),
      options: optionsValidator,
      session: v.union(sessionValidator, v.null()),
      matchingSession: v.optional(v.union(matchingSessionValidator, v.null())),
      activitySessions: v.optional(v.array(activitySessionValidator)),
      results: v.array(
        v.object({
          sessionId: v.string(),
          gameId: v.string(),
          worldId: v.string(),
          points: v.number(),
          completedAt: v.number(),
        }),
      ),
    }),
  }).index("by_key", ["keyHash"]),
});
