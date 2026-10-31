/*
  Replace nulls with public asset paths when the standalone artwork arrives.
  Reference boards are deliberately not used as game backgrounds: they contain
  baked-in controls and text. Rules and accessible UI stay independent of art.
*/
export const artwork: {
  mascot: Record<"wave" | "cheer" | "think", string | null>;
  backgrounds: Record<string, string | null>;
  islands: Record<string, string | null>;
} = {
  mascot: { wave: null, cheer: null, think: null },
  backgrounds: {
    jungle: null,
    desert: null,
    arctic: null,
    city: null,
    ocean: null,
  },
  islands: {
    jungle: null,
    desert: null,
    arctic: null,
    city: null,
    ocean: null,
  },
};
