"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createPlayerState,
  playerStateSchema,
  awardCompletion,
  type PlayerState,
} from "@/lib/platform/progress";
import {
  applyBingoMove,
  createBingoSession,
  type MoveResult,
} from "@/lib/games/bingo";
import { isWorldUnlocked } from "@/lib/games/worlds";
import { commandSchema, type GameCommand } from "@/lib/platform/commands";

type CommandResponse = {
  state: PlayerState;
  outcome: MoveResult["outcome"] | null;
};
type GameContextValue = {
  state: PlayerState | null;
  storage: "cloud" | "device";
  isBusy: boolean;
  error: string | null;
  send: (command: GameCommand) => Promise<CommandResponse | null>;
  reload: () => Promise<void>;
};
const GameContext = createContext<GameContextValue | null>(null);
const storageKey = "learning-games:player:v1";
async function loadPlayer(
  signal?: AbortSignal,
): Promise<{ storage: "cloud" | "device"; state: PlayerState }> {
  const response = await fetch("/api/player", { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  if (data.storage === "cloud")
    return { storage: "cloud", state: playerStateSchema.parse(data.state) };
  const saved = localStorage.getItem(storageKey);
  let parsed;
  try {
    parsed = playerStateSchema.safeParse(
      saved ? JSON.parse(saved) : createPlayerState(),
    );
  } catch {
    parsed = playerStateSchema.safeParse(createPlayerState());
  }
  return {
    storage: "device",
    state: parsed.success ? parsed.data : createPlayerState(),
  };
}
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [storage, setStorage] = useState<"cloud" | "device">("cloud");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPendingCommand = useRef(false);
  async function reload() {
    try {
      const loaded = await loadPlayer();
      setState(loaded.state);
      setStorage(loaded.storage);
      setError(null);
    } catch {
      setError(
        "We couldn’t load your adventure. Check your connection and try again.",
      );
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void loadPlayer(controller.signal)
      .then((loaded) => {
        setState(loaded.state);
        setStorage(loaded.storage);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "We couldn’t load your adventure. Check your connection and try again.",
          );
      });
    return () => controller.abort();
  }, []);
  async function send(command: GameCommand): Promise<CommandResponse | null> {
    if (!state || hasPendingCommand.current) return null;
    hasPendingCommand.current = true;
    setIsBusy(true);
    setError(null);
    try {
      const input = commandSchema.parse(command);
      let result: CommandResponse;
      if (storage === "cloud") {
        const response = await fetch("/api/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        result = {
          state: playerStateSchema.parse(data.state),
          outcome: data.outcome,
        };
      } else {
        let next = state;
        let outcome: CommandResponse["outcome"] = null;
        if (input.kind === "options")
          next = { ...state, options: input.options };
        if (input.kind === "start") {
          if (!isWorldUnlocked(input.worldId, state.stars))
            throw new Error("World locked");
          next = {
            ...state,
            options: input.options,
            session: createBingoSession(
              crypto.randomUUID(),
              input.worldId,
              input.options,
            ),
          };
        }
        if (
          input.kind === "move" &&
          state.session?.id === input.sessionId &&
          state.session.revision === input.expectedRevision
        ) {
          const move = applyBingoMove(state.session, input.word);
          next = awardCompletion(state, move.session);
          outcome = move.outcome;
        }
        localStorage.setItem(storageKey, JSON.stringify(next));
        result = { state: next, outcome };
      }
      setState(result.state);
      return result;
    } catch {
      setError(
        "That didn’t save. Check your connection, then try again. Your last saved progress is safe.",
      );
      return null;
    } finally {
      hasPendingCommand.current = false;
      setIsBusy(false);
    }
  }
  return (
    <GameContext.Provider
      value={{ state, storage, isBusy, error, send, reload }}
    >
      {children}
    </GameContext.Provider>
  );
}
export function useGamePlatform() {
  const context = useContext(GameContext);
  if (!context) throw new Error("Game components need GameProvider");
  return context;
}
