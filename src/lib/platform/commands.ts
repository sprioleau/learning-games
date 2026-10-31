import { z } from "zod";
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
  z.object({ kind: z.literal("options"), options: gameOptionsSchema }),
]);
export type GameCommand = z.infer<typeof commandSchema>;
