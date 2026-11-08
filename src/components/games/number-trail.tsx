"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { GameScene, SceneHeader } from "@/components/scene/game-scene";
import { Mascot } from "@/components/hub/mascot";
import { Button } from "@/components/ui/button";
import { Celebration } from "@/components/games/celebration";
import { useGamePlatform } from "@/components/games/game-provider";
import { playSound, prepareGameAudio } from "@/lib/platform/audio";
import { getWorld } from "@/lib/games/worlds";
import type { TrailOperation, TrailQuestion } from "@/lib/games/number-trail";
import "./number-trail.css";

export function NumberTrail() {
  const { state, send, isBusy, error, reload } = useGamePlatform();
  const [operation, setOperation] = useState<TrailOperation>("addition");
  const [isChoosing, setIsChoosing] = useState(false);
  const [message, setMessage] = useState("Choose where the trail ends!");
  const session = state?.activitySessions.find(
    (item) => item.gameId === "number-trail",
  );
  const isWon = session?.phase === "won";
  const question =
    session?.phase === "playing" && session.questions[session.cursor]
      ? (JSON.parse(session.questions[session.cursor].payload) as TrailQuestion)
      : null;
  const world = getWorld(
    session?.worldId ?? state?.session?.worldId ?? "jungle",
  );
  const isSoundEnabled = state?.options.isSoundEnabled ?? true;

  async function startGame(mode: TrailOperation = operation) {
    if (!state) return;
    prepareGameAudio();
    const result = await send({
      kind: "activity-start",
      gameId: "number-trail",
      mode,
      worldId: world.id,
    });
    if (result) {
      setIsChoosing(false);
      setMessage("Choose where the trail ends!");
    }
  }
  async function chooseNumber(number: number) {
    if (!question || !session || isBusy) return;
    const isCorrect = number === question.answer;
    playSound(
      isCorrect
        ? session.cursor + 1 === session.questions.length
          ? "win"
          : "correct"
        : "incorrect",
      isSoundEnabled,
    );
    const result = await send({
      kind: "activity-answer",
      gameId: "number-trail",
      sessionId: session.id,
      expectedRevision: session.revision,
      answer: number,
    });
    if (!result) return;
    if (result.outcome === "incorrect") {
      setMessage("Not quite. Count the steps and try again!");
    } else if (result.outcome === "won") {
      setMessage("You finished the number trail!");
    } else if (result.outcome === "correct") {
      setMessage(`Yes! You landed on ${number}. Here’s the next trail!`);
    }
  }

  return (
    <GameScene world={world.id} className="number-trail-scene">
      <SceneHeader title="Number Trail" />
      <div className="number-trail-mascot floating-mascot">
        <Mascot pose={isWon ? "cheer" : "wave"} />
      </div>
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error} <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {!state && !error && (
        <div className="scene-loading" role="status">
          Finding your trail…
        </div>
      )}
      <section
        className="number-trail-panel parchment-panel"
        aria-label="Number Trail game"
      >
        {state && (!session || isChoosing) ? (
          <div className="number-trail-intro">
            <span className="panel-eyebrow">A NUMBER ADVENTURE</span>
            <h2>Hop along the number trail!</h2>
            <p>Count the steps and choose where you land.</p>
            <div
              className="number-trail-operationChoices"
              role="group"
              aria-label="Choose a number challenge"
            >
              {(
                [
                  ["addition", "Add"],
                  ["subtraction", "Subtract"],
                  ["mixed", "Mix it up"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  variant="outline"
                  aria-pressed={operation === id}
                  onClick={() => setOperation(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              className="play-button coral-button"
              onClick={() => startGame()}
              disabled={isBusy}
            >
              <Play fill="currentColor" /> Let’s play
            </Button>
            {session?.phase === "playing" && (
              <Button
                variant="outline"
                className="number-trail-changeChallenge"
                onClick={() => setIsChoosing(false)}
              >
                Keep playing
              </Button>
            )}
          </div>
        ) : state && isWon && session ? (
          <div className="number-trail-intro">
            {state.options.isCelebrationEnabled && <Celebration />}
            <span className="panel-eyebrow">AMAZING EXPLORING!</span>
            <h2>Trail complete!</h2>
            <p>You followed all five number trails and earned a star!</p>
            <Button
              className="play-button coral-button"
              onClick={() => startGame(session.mode as TrailOperation)}
              disabled={isBusy}
            >
              <RotateCcw /> Play again
            </Button>
            <Button
              variant="outline"
              className="number-trail-changeChallenge"
              onClick={() => setIsChoosing(true)}
            >
              Choose a challenge
            </Button>
          </div>
        ) : question && session && !isChoosing ? (
          <div className="number-trail-game">
            <div className="number-trail-heading">
              <div>
                <span className="panel-eyebrow">
                  TRAIL {session.cursor + 1} OF {session.questions.length}
                </span>
                <h2>Where will you land?</h2>
                <p>
                  Start at <strong>{question.start}</strong>. Hop{" "}
                  {question.steps}{" "}
                  {question.operation === "addition" ? "forward" : "backward"}.
                </p>
              </div>
              <div
                className="number-trail-equation"
                aria-label={`${question.start} ${question.operation === "addition" ? "plus" : "minus"} ${question.steps} equals what?`}
              >
                {question.start} {question.operation === "addition" ? "+" : "−"}{" "}
                {question.steps} = ?
              </div>
            </div>
            <div
              className="number-trail-numberLine"
              role="group"
              aria-label="Choose the answer on the number line"
            >
              {Array.from({ length: 11 }, (_, number) => (
                <button
                  key={number}
                  type="button"
                  className={`number-trail-number ${number === question.start ? "number-trail-start" : ""}`}
                  aria-label={`Choose ${number}${number === question.start ? ", starting number" : ""}`}
                  disabled={isBusy}
                  onClick={() => chooseNumber(number)}
                >
                  {number === question.start && (
                    <span className="number-trail-marker" aria-hidden="true">
                      ★
                    </span>
                  )}
                  {number}
                </button>
              ))}
            </div>
            <p className="number-trail-status" role="status" aria-live="polite">
              {message}
            </p>
            <button
              className="number-trail-restart"
              type="button"
              onClick={() => setIsChoosing(true)}
              disabled={isBusy}
            >
              Choose a different challenge
            </button>
          </div>
        ) : null}
      </section>
    </GameScene>
  );
}
