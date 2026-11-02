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
  awardMatchingCompletion,
  type PlayerState,
} from "@/lib/platform/progress";
import {
  applyBingoMove,
  createBingoSession,
  type MoveResult,
} from "@/lib/games/bingo";
import {
  clearMatchingCards,
  createMatchingSession,
  flipMatchingCard,
  type MatchingOutcome,
} from "@/lib/games/matching";
import { isWorldUnlocked } from "@/lib/games/worlds";
import { commandSchema, type GameCommand } from "@/lib/platform/commands";

type CommandResponse = {
  state: PlayerState;
  outcome: MoveResult["outcome"] | null;
};
type MoveCommand = Extract<GameCommand, { kind: "move" }>;
type MatchingCommand = Extract<
  GameCommand,
  { kind: "matching-flip" | "matching-clear" }
>;
type GameContextValue = {
  state: PlayerState | null;
  storage: "cloud" | "device";
  isBusy: boolean;
  isAdminMode: boolean;
  isSavingMoves: boolean;
  isSavingMatching: boolean;
  match: (index: number | null) => MatchingOutcome;
  error: string | null;
  move: (word: string) => MoveResult | null;
  send: (command: GameCommand) => Promise<CommandResponse | null>;
  reload: () => Promise<void>;
};
const GameContext = createContext<GameContextValue | null>(null);
const storageKey = "learning-games:player:v1";
async function loadPlayer(signal?: AbortSignal): Promise<{
  storage: "cloud" | "device";
  state: PlayerState;
  isAdminMode: boolean;
}> {
  const response = await fetch("/api/player", { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  if (data.storage === "cloud")
    return {
      storage: "cloud",
      state: playerStateSchema.parse(data.state),
      isAdminMode: Boolean(data.isAdminMode),
    };
  const saved = localStorage.getItem(
    data.isAdminMode ? `${storageKey}:admin` : storageKey,
  );
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
    isAdminMode: Boolean(data.isAdminMode),
    state: parsed.success ? parsed.data : createPlayerState(),
  };
}
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [storage, setStorage] = useState<"cloud" | "device">("cloud");
  const [isBusy, setIsBusy] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isSavingMoves, setIsSavingMoves] = useState(false);
  const [isSavingMatching, setIsSavingMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPendingCommand = useRef(false);
  const hasMoveDrain = useRef(false);
  const pendingMoves = useRef<MoveCommand[]>([]);
  const pendingMatching = useRef<MatchingCommand[]>([]);
  const hasMatchingDrain = useRef(false);
  const currentState = useRef<PlayerState | null>(null);
  const confirmedState = useRef<PlayerState | null>(null);
  function publishState(next: PlayerState) {
    currentState.current = next;
    setState(next);
  }
  function acceptState(next: PlayerState) {
    confirmedState.current = next;
    publishState(next);
  }
  async function reload() {
    if (
      hasPendingCommand.current ||
      pendingMoves.current.length ||
      pendingMatching.current.length
    )
      return;
    try {
      const loaded = await loadPlayer();
      acceptState(loaded.state);
      setStorage(loaded.storage);
      setIsAdminMode(loaded.isAdminMode);
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
        confirmedState.current = loaded.state;
        currentState.current = loaded.state;
        setState(loaded.state);
        setStorage(loaded.storage);
        setIsAdminMode(loaded.isAdminMode);
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
    const state = currentState.current;
    if (
      !state ||
      hasPendingCommand.current ||
      pendingMoves.current.length ||
      pendingMatching.current.length
    )
      return null;
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
          if (!isAdminMode && !isWorldUnlocked(input.worldId, state.stars))
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
        if (input.kind === "matching-start") {
          if (!isAdminMode && !isWorldUnlocked(input.worldId, state.stars))
            throw new Error("World locked");
          next = {
            ...state,
            matchingSession: createMatchingSession(
              crypto.randomUUID(),
              input.worldId,
              Math.random,
              Date.now(),
              input.pairCount,
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
        localStorage.setItem(
          isAdminMode ? `${storageKey}:admin` : storageKey,
          JSON.stringify(next),
        );
        result = { state: next, outcome };
      }
      acceptState(result.state);
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
  async function drainMoves() {
    if (hasMoveDrain.current) return;
    hasMoveDrain.current = true;
    try {
      while (pendingMoves.current.length) {
        const command = pendingMoves.current[0];
        const response = await fetch("/api/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Move was not saved");
        const saved = playerStateSchema.parse(data.state);
        confirmedState.current = saved;
        pendingMoves.current.shift();
        let projected = saved;
        let hasConflict = data.outcome !== "correct" && data.outcome !== "won";
        for (const queued of pendingMoves.current) {
          if (
            !projected.session ||
            projected.session.id !== queued.sessionId ||
            projected.session.revision !== queued.expectedRevision
          ) {
            hasConflict = true;
            break;
          }
          const predicted = applyBingoMove(projected.session, queued.word);
          if (predicted.outcome !== "correct" && predicted.outcome !== "won") {
            hasConflict = true;
            break;
          }
          projected = { ...projected, session: predicted.session };
        }
        if (hasConflict) {
          pendingMoves.current = [];
          publishState(saved);
          setError(
            "Your saved board changed. We’ve restored it so you can keep playing.",
          );
          break;
        }
        publishState(projected);
      }
    } catch {
      pendingMoves.current = [];
      if (confirmedState.current) publishState(confirmedState.current);
      setError(
        "That didn’t save. Check your connection, then try again. Your last saved progress is safe.",
      );
    } finally {
      hasMoveDrain.current = false;
      setIsSavingMoves(false);
      setIsBusy(false);
    }
  }
  async function drainMatching() {
    if (hasMatchingDrain.current) return;
    hasMatchingDrain.current = true;
    try {
      while (pendingMatching.current.length) {
        const command = pendingMatching.current[0];
        const response = await fetch("/api/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Move was not saved");
        const saved = playerStateSchema.parse(data.state);
        confirmedState.current = saved;
        pendingMatching.current.shift();
        let projected = saved;
        let hasConflict = data.outcome === "ignored";
        for (const queued of pendingMatching.current) {
          if (
            !projected.matchingSession ||
            projected.matchingSession.id !== queued.sessionId ||
            projected.matchingSession.revision !== queued.expectedRevision
          ) {
            hasConflict = true;
            break;
          }
          const next =
            queued.kind === "matching-flip"
              ? flipMatchingCard(projected.matchingSession, queued.index)
                  .session
              : clearMatchingCards(projected.matchingSession);
          if (next.revision !== queued.expectedRevision + 1) {
            hasConflict = true;
            break;
          }
          projected = { ...projected, matchingSession: next };
        }
        if (hasConflict) {
          pendingMatching.current = [];
          publishState(saved);
          setError(
            "Your saved board changed. We’ve restored it so you can keep playing.",
          );
          break;
        }
        publishState(projected);
      }
    } catch {
      pendingMatching.current = [];
      if (confirmedState.current) publishState(confirmedState.current);
      setError(
        "That didn’t save. Check your connection, then try again. Your last saved progress is safe.",
      );
    } finally {
      hasMatchingDrain.current = false;
      setIsSavingMatching(false);
      setIsBusy(false);
    }
  }
  function match(index: number | null): MatchingOutcome {
    const state = currentState.current;
    if (
      !state?.matchingSession ||
      hasPendingCommand.current ||
      pendingMoves.current.length
    )
      return "ignored";
    const session = state.matchingSession;
    const result =
      index === null
        ? { session: clearMatchingCards(session), outcome: "flip" as const }
        : flipMatchingCard(session, index);
    if (result.session.revision === session.revision) return "ignored";
    setError(null);
    if (storage === "device") {
      try {
        const next = awardMatchingCompletion(state, result.session);
        localStorage.setItem(
          isAdminMode ? `${storageKey}:admin` : storageKey,
          JSON.stringify(next),
        );
        acceptState(next);
      } catch {
        setError(
          "That didn’t save. Check your connection, then try again. Your last saved progress is safe.",
        );
        return "ignored";
      }
      return result.outcome;
    }
    const command =
      index === null
        ? {
            kind: "matching-clear" as const,
            sessionId: session.id,
            expectedRevision: session.revision,
          }
        : {
            kind: "matching-flip" as const,
            sessionId: session.id,
            expectedRevision: session.revision,
            index,
          };
    pendingMatching.current.push(command);
    publishState({ ...state, matchingSession: result.session });
    setIsSavingMatching(true);
    setIsBusy(true);
    void drainMatching();
    return result.outcome;
  }
  function move(word: string): MoveResult | null {
    const state = currentState.current;
    if (
      !state?.session ||
      hasPendingCommand.current ||
      pendingMatching.current.length
    )
      return null;
    const predicted = applyBingoMove(state.session, word);
    if (predicted.outcome === "ignored" || predicted.outcome === "incorrect")
      return predicted;
    setError(null);
    if (storage === "device") {
      try {
        const next = awardCompletion(state, predicted.session);
        localStorage.setItem(
          isAdminMode ? `${storageKey}:admin` : storageKey,
          JSON.stringify(next),
        );
        acceptState(next);
      } catch {
        setError(
          "That didn’t save. Check your connection, then try again. Your last saved progress is safe.",
        );
        return null;
      }
      return predicted;
    }
    /*
      Only the session is predicted. Stars and rewards come from acknowledged
      server state. Serialize writes while allowing the next word to be played.
    */
    pendingMoves.current.push({
      kind: "move",
      sessionId: state.session.id,
      expectedRevision: state.session.revision,
      word,
    });
    publishState({ ...state, session: predicted.session });
    setIsSavingMoves(true);
    setIsBusy(true);
    void drainMoves();
    return predicted;
  }
  return (
    <GameContext.Provider
      value={{
        state,
        storage,
        isBusy,
        isAdminMode,
        isSavingMoves,
        isSavingMatching,
        match,
        error,
        move,
        send,
        reload,
      }}
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
