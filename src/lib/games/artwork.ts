import type { WorldId } from "./worlds";

/* Keep asset URLs independent of rules and interactive, accessible UI. */
export const artwork = {
  logo: {
    color: "/assets/branding/logo-mark.png",
    dark: "/assets/branding/logo-mark-dark.png",
    white: "/assets/branding/logo-mark-white.png",
  },
  rewardStar: "/assets/rewards/reward-star.png",
  mascot: {
    wave: "/assets/mascot/mascot-wave.png",
    cheer: "/assets/mascot/mascot-cheer.png",
    think: "/assets/mascot/mascot-think.png",
  },
  backgrounds: Object.fromEntries(
    ["jungle", "desert", "arctic", "city", "ocean"].map((world) => [
      world,
      `/assets/worlds/world-${world}.webp`,
    ]),
  ) as Record<WorldId, string>,
  islands: Object.fromEntries(
    ["jungle", "desert", "arctic", "city", "ocean"].map((world) => [
      world,
      `/assets/islands/island-${world}.png`,
    ]),
  ) as Record<WorldId, string>,
};
