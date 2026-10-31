export const worlds = [
  {
    id: "jungle",
    name: "Jungle Journey",
    shortName: "Jungle",
    emoji: "🌴",
    description: "Big leaves. Little discoveries.",
    color: "#dcefc7",
    ink: "#326548",
    starsRequired: 0,
  },
  {
    id: "desert",
    name: "Desert Discovery",
    shortName: "Desert",
    emoji: "🏜️",
    description: "A golden adventure awaits.",
    color: "#ffe4b3",
    ink: "#91542d",
    starsRequired: 5,
  },
  {
    id: "arctic",
    name: "Arctic Adventure",
    shortName: "Arctic",
    emoji: "🏔️",
    description: "Cool words, warm celebrations.",
    color: "#d5edf8",
    ink: "#376c88",
    starsRequired: 10,
  },
  {
    id: "city",
    name: "Curious City",
    shortName: "City",
    emoji: "🏙️",
    description: "A world of everyday wonders.",
    color: "#e8defa",
    ink: "#73569a",
    starsRequired: 15,
  },
  {
    id: "ocean",
    name: "Ocean Explorers",
    shortName: "Ocean",
    emoji: "🏝️",
    description: "Dive into something wonderful.",
    color: "#c8eeea",
    ink: "#276f78",
    starsRequired: 20,
  },
] as const;
export type WorldId = (typeof worlds)[number]["id"];
export function getWorld(id: string) {
  return worlds.find((world) => world.id === id) ?? worlds[0];
}
export function isWorldUnlocked(id: string, stars: number) {
  return stars >= getWorld(id).starsRequired;
}
