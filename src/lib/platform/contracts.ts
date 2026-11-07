/*
  All games share versioned sessions and commands. A future room adapter can
  broadcast authoritative revisions without changing individual game rules.
  Room membership must be invite-only; there is deliberately no public chat.
*/
export type SessionMode = "solo" | "cooperative" | "versus";
export type Participant = {
  playerId: string;
  displayName: string;
  isHost: boolean;
  isConnected: boolean;
};
export type GameRoom = {
  id: string;
  inviteCode: string;
  gameId: string;
  mode: SessionMode;
  participants: Participant[];
  maxPlayers: number;
  phase: "lobby" | "playing" | "finished";
  revision: number;
};
export type SessionCommand<TPayload> = {
  id: string;
  sessionId: string;
  expectedRevision: number;
  payload: TPayload;
};
export type LeaderboardEntry = {
  id: string;
  label: string;
  points: number;
  completedAt: number;
};
export type GameDefinition = {
  id: string;
  title: string;
  minAge: number;
  maxAge: number;
  modes: SessionMode[];
  hasCanvas: boolean;
};
export const gameRegistry: GameDefinition[] = [
  {
    id: "jigsaw",
    title: "Jungle Jigsaw",
    minAge: 5,
    maxAge: 10,
    modes: ["solo"],
    hasCanvas: true,
  },
  {
    id: "math-drops",
    title: "Math Drops",
    minAge: 5,
    maxAge: 10,
    modes: ["solo"],
    hasCanvas: false,
  },
  {
    id: "word-builder",
    title: "Word Builder",
    minAge: 5,
    maxAge: 8,
    modes: ["solo"],
    hasCanvas: false,
  },
  {
    id: "fraction-cafe",
    title: "Fraction Café",
    minAge: 6,
    maxAge: 10,
    modes: ["solo"],
    hasCanvas: false,
  },
  {
    id: "number-trail",
    title: "Number Trail",
    minAge: 5,
    maxAge: 9,
    modes: ["solo"],
    hasCanvas: false,
  },
  {
    id: "card-matching",
    title: "Picture Pairs",
    minAge: 4,
    maxAge: 10,
    modes: ["solo"],
    hasCanvas: false,
  },
  {
    id: "word-bingo",
    title: "Word Bingo",
    minAge: 4,
    maxAge: 6,
    modes: ["solo"],
    hasCanvas: false,
  },
];
