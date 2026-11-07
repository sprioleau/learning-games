"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GameScene, SceneHeader } from "@/components/scene/game-scene";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Celebration } from "@/components/games/celebration";
import { useGamePlatform } from "@/components/games/game-provider";
import { mathOperations, type MathOperation } from "@/lib/games/math-drops";
import { getWorld } from "@/lib/games/worlds";
import { playSound, prepareGameAudio } from "@/lib/platform/audio";
import "./math-drops.css";

const roundGoal = 8;
const operationLabels: Record<MathOperation, string> = {
  addition: "Addition +",
  subtraction: "Subtract −",
  multiplication: "Multiply ×",
  division: "Divide ÷",
};
type Speed = "gentle" | "quick";
const speeds: Record<Speed, number> = { gentle: 20, quick: 12 };
export function MathDrops() {
  const { state, send, isBusy, error, reload } = useGamePlatform();
  const [operation, setOperation] = useState<MathOperation>("addition");
  const [speed, setSpeed] = useState<Speed>("gentle");
  const [isChoosing, setIsChoosing] = useState(false);
  const [remaining, setRemaining] = useState(speeds.gentle);
  const remainingRef = useRef(speeds.gentle);
  const answerRef = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isSplashing, setIsSplashing] = useState(false);
  const [message, setMessage] = useState(
    "Solve the falling problem before it reaches the water!",
  );
  const session = state?.activitySessions.find(
    (item) => item.gameId === "math-drops",
  );
  const isPlaying = session?.phase === "playing" && !isChoosing;
  const isWon = session?.phase === "won" && !isChoosing;
  const question = isPlaying ? session?.questions[session.cursor] : null;
  const correctCount = session?.cursor ?? 0;
  const world = getWorld(
    session?.worldId ?? state?.session?.worldId ?? "jungle",
  );
  const isSoundEnabled = state?.options.isSoundEnabled ?? true;
  const skipExpiredDrop = useEffectEvent(async () => {
    if (!session) return;
    const result = await send({
      kind: "activity-skip",
      gameId: "math-drops",
      sessionId: session.id,
      expectedRevision: session.revision,
    });
    setIsSplashing(false);
    if (!result) {
      setIsPaused(true);
      setMessage(
        "Let's pause while we reconnect. Try again when you're ready.",
      );
      return;
    }
    remainingRef.current = speeds[speed];
    setRemaining(speeds[speed]);
    setAnswer("");
    setMessage("Splash! Here's a new problem.");
  });
  useEffect(() => {
    if (!isPlaying || isPaused || isBusy) return;
    let splashTimer: number | undefined;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const time = Math.max(0, remainingRef.current - 0.1);
      remainingRef.current = time;
      setRemaining(time);
      if (time <= 0) {
        window.clearInterval(timer);
        setIsSplashing(true);
        setAnswer("");
        setMessage("Splash!");
        splashTimer = window.setTimeout(() => void skipExpiredDrop(), 500);
      }
    }, 100);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(splashTimer);
    };
  }, [isPlaying, isPaused, isBusy, speed]);
  async function startRound(mode: MathOperation = operation) {
    if (!state || isBusy) return;
    prepareGameAudio();
    const result = await send({
      kind: "activity-start",
      gameId: "math-drops",
      mode,
      worldId: world.id,
    });
    if (!result) return;
    remainingRef.current = speeds[speed];
    setRemaining(speeds[speed]);
    setAnswer("");
    setMessage("Solve the falling problem before it reaches the water!");
    setIsPaused(false);
    setIsSplashing(false);
    setIsChoosing(false);
  }
  async function submitAnswer() {
    if (
      !isPlaying ||
      isPaused ||
      isSplashing ||
      isBusy ||
      !session ||
      !question ||
      answer === ""
    )
      return;
    const submittedAnswer = Number(answer);
    setAnswer("");
    answerRef.current?.focus({ preventScroll: true });
    const result = await send({
      kind: "activity-answer",
      gameId: "math-drops",
      sessionId: session.id,
      expectedRevision: session.revision,
      answer: submittedAnswer,
    });
    if (!result) return;
    if (result.outcome === "incorrect") {
      playSound("incorrect", isSoundEnabled);
      setMessage("Not quite. Try again!");
    } else if (result.outcome === "won") {
      setMessage("You solved all eight problems!");
      playSound("win", isSoundEnabled);
    } else if (result.outcome === "correct") {
      playSound("correct", isSoundEnabled);
      setMessage("You got it! Here comes another.");
      remainingRef.current = speeds[speed];
      setRemaining(speeds[speed]);
    }
  }
  function addDigit(digit: string) {
    if (isPlaying && !isPaused && !isSplashing && !isBusy)
      setAnswer((current) => (current + digit).slice(0, 3));
  }
  return (
    <GameScene world={world.id} className="math-drops-scene">
      <SceneHeader title="Math Drops" />
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error} <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {!state && !error && (
        <div className="scene-loading" role="status">
          Finding your math drops…
        </div>
      )}
      <div className="math-drops-area">
        <section className="math-drops-panel" aria-label="Math Drops settings">
          <h2>Make a splash!</h2>
          <p>Pick your math</p>
          <div
            className="math-drops-operations"
            role="group"
            aria-label="Choose a math operation"
          >
            {mathOperations.map((item) => (
              <Button
                key={item}
                variant="outline"
                aria-pressed={(isPlaying ? session?.mode : operation) === item}
                disabled={Boolean(isPlaying) || isBusy}
                onClick={() => setOperation(item)}
              >
                {operationLabels[item]}
              </Button>
            ))}
          </div>
          <p>Choose a speed</p>
          <div
            className="math-drops-speed"
            role="group"
            aria-label="Choose falling speed"
          >
            <Button
              variant="outline"
              aria-pressed={speed === "gentle"}
              disabled={Boolean(isPlaying) || isBusy}
              onClick={() => setSpeed("gentle")}
            >
              Gentle
            </Button>
            <Button
              variant="outline"
              aria-pressed={speed === "quick"}
              disabled={Boolean(isPlaying) || isBusy}
              onClick={() => setSpeed("quick")}
            >
              Quick
            </Button>
          </div>
          <div className="math-drops-score">
            <span>
              {correctCount} / {roundGoal} solved
            </span>
            <span>{correctCount * 10} round points</span>
          </div>
          {isPlaying ? (
            <Button
              className={`play-button math-drops-start`}
              disabled={isSplashing || isBusy}
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>
          ) : (
            <Button
              className={`play-button math-drops-start`}
              disabled={!state || isBusy}
              onClick={() => startRound()}
            >
              <span>Start playing</span>
            </Button>
          )}
        </section>
        <section
          className="math-drops-ground"
          aria-label="Falling math problem"
        >
          <span className="math-drops-tip">
            {isPlaying
              ? isPaused
                ? "Paused"
                : "Solve it before the splash!"
              : "Ready to catch a drop?"}
          </span>
          <div className="math-drops-water" aria-hidden="true" />
          <div className="math-drops-threshold" aria-hidden="true" />
          {question && isPlaying && !isSplashing && (
            <div
              className="math-drops-drop"
              style={
                {
                  "--drop-top": `calc(10% + (62% - 10cqw) * ${1 - remaining / speeds[speed]})`,
                } as CSSProperties
              }
            >
              <span className="math-drops-dropText">{question.prompt}</span>
            </div>
          )}
          {isSplashing && (
            <div className="math-drops-splash" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
        </section>
        <form
          className={`math-drops-panel math-drops-answer`}
          onSubmit={(event) => {
            event.preventDefault();
            void submitAnswer();
          }}
        >
          <label htmlFor="math-drops-answer">Your answer</label>
          <input
            id="math-drops-answer"
            ref={answerRef}
            className="math-drops-input"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer}
            disabled={!isPlaying || isPaused || isSplashing}
            onChange={(event) =>
              setAnswer(event.target.value.replace(/\D/g, "").slice(0, 3))
            }
          />
          <div className="math-drops-keypad" aria-label="Number pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <Button
                key={digit}
                type="button"
                variant="outline"
                disabled={!isPlaying || isPaused || isSplashing || isBusy}
                onClick={() => addDigit(digit)}
              >
                {digit}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              aria-label="Delete last digit"
              disabled={!isPlaying || isPaused || isSplashing || isBusy}
              onClick={() => setAnswer((current) => current.slice(0, -1))}
            >
              ⌫
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isPlaying || isPaused || isSplashing || isBusy}
              onClick={() => addDigit("0")}
            >
              0
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={
                !isPlaying || isPaused || isSplashing || isBusy || !answer
              }
            >
              Go!
            </Button>
          </div>
          <div className="math-drops-feedback" role="status" aria-live="polite">
            {message}
          </div>
        </form>
      </div>
      <Dialog
        open={Boolean(isWon)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setIsChoosing(true);
        }}
      >
        <DialogContent className="math-drops-win" hasCloseButton={false}>
          {state?.options.isCelebrationEnabled !== false && <Celebration />}
          <DialogTitle>Splash-tastic!</DialogTitle>
          <DialogDescription>
            You solved {roundGoal} math drops and earned a star!
          </DialogDescription>
          <Button
            className="play-button"
            onClick={() => startRound(session?.mode as MathOperation)}
          >
            Play again
          </Button>
          <Button variant="outline" onClick={() => setIsChoosing(true)}>
            Change game options
          </Button>
        </DialogContent>
      </Dialog>
    </GameScene>
  );
}
