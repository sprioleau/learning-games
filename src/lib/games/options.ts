import { z } from "zod";

/*
  Options are a versioned rules contract, captured when a session starts.
  Presentation preferences may change mid-game; rule changes start a new session.
*/
export const gameOptionsSchema = z.object({
  version: z.literal(1).default(1),
  wordSet: z.enum(["starter", "sight"]).default("starter"),
  hasWordHints: z.boolean().default(false),
  isSoundEnabled: z.boolean().default(true),
  isMusicEnabled: z.boolean().default(true),
  isCelebrationEnabled: z.boolean().default(true),
  speechRate: z.enum(["gentle", "normal"]).default("gentle"),
});
export type GameOptions = z.infer<typeof gameOptionsSchema>;
export const defaultOptions = gameOptionsSchema.parse({});
export const optionDefinitions = {
  wordSet: {
    label: "Word collection",
    scope: "rules",
    values: ["starter", "sight"],
  },
  hasWordHints: { label: "Show the spoken word", scope: "assistance" },
  isSoundEnabled: { label: "Sound effects", scope: "presentation" },
  isMusicEnabled: { label: "Background music", scope: "presentation" },
  isCelebrationEnabled: {
    label: "Celebration animations",
    scope: "presentation",
  },
  speechRate: {
    label: "Speaking speed",
    scope: "assistance",
    values: ["gentle", "normal"],
  },
} as const;
