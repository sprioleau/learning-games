import { z } from "zod";
import {
  activityAnswerSchema,
  activityGameSchema,
  activityModeSchema,
} from "../games/activity";
import { matchingPairCountSchema } from "../games/matching";
import { gameOptionsSchema } from "../games/options";
export const commandSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("start"),
    worldId: z.enum(["jungle", "desert", "arctic", "city", "ocean"]),
    options: gameOptionsSchema,
  }),
  z.object({
    kind: z.literal("move"),
    sessionId: z.string(),
    expectedRevision: z.number().int().min(0),
    word: z.string().max(20),
  }),
  z.object({
    kind: z.literal("matching-start"),
    pairCount: matchingPairCountSchema.optional(),
    worldId: z.enum(["jungle", "desert", "arctic", "city", "ocean"]),
  }),
  z.object({
    kind: z.literal("matching-flip"),
    sessionId: z.string(),
    expectedRevision: z.number().int().min(0),
    index: z.number().int().min(0).max(19),
  }),
  z.object({
    kind: z.literal("matching-clear"),
    sessionId: z.string(),
    expectedRevision: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal("activity-start"),
    gameId: activityGameSchema,
    sceneIndex: z.number().int().min(0).max(2).optional(),
    mode: activityModeSchema,
    worldId: z.enum(["jungle", "desert", "arctic", "city", "ocean"]),
  }),
  z.object({
    kind: z.literal("activity-answer"),
    gameId: activityGameSchema,
    sessionId: z.string(),
    expectedRevision: z.number().int().min(0),
    answer: activityAnswerSchema,
  }),
  z.object({
    kind: z.literal("activity-skip"),
    gameId: z.literal("math-drops"),
    sessionId: z.string(),
    expectedRevision: z.number().int().min(0),
  }),
  z.object({ kind: z.literal("options"), options: gameOptionsSchema }),
]);
export type GameCommand = z.infer<typeof commandSchema>;
