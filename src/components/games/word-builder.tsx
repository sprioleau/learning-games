"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Volume2 } from "lucide-react";
import { GameScene, SceneHeader } from "@/components/scene/game-scene";
import { Mascot } from "@/components/hub/mascot";
import { Button } from "@/components/ui/button";
import { useGamePlatform } from "@/components/games/game-provider";
import {
  playSound,
  prepareGameAudio,
  speakWord,
  stopSpeaking,
} from "@/lib/platform/audio";
import { shuffle } from "@/lib/games/bingo";
import type { ActivitySession } from "@/lib/games/activity";
import "./word-builder.css";

type Puzzle = { word: string; picture: string | null; sentence: string };
type Letter = { id: number; value: string };
function createLetters(word: string): Letter[] {
  return shuffle(Array.from(word, (value, id) => ({ id, value })));
}
function WordRound({ session }: { session: ActivitySession }) {
  const { state, send, isBusy } = useGamePlatform();
  const puzzle = JSON.parse(
    session.questions[session.cursor].payload,
  ) as Puzzle;
  const [letters] = useState(() => createLetters(puzzle.word));
  const [selected, setSelected] = useState<number[]>([]);
  const answerArea = useRef<HTMLDivElement>(null);
  const checkButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    hasMoved: boolean;
  } | null>(null);
  const shouldSuppressClick = useRef(false);
  const [dragging, setDragging] = useState<{
    id: number;
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const [message, setMessage] = useState(
    "Listen, then tap, drag, or type letters to spell the word.",
  );
  function addLetter(id: number) {
    setSelected((current) =>
      current.length < puzzle.word.length && !current.includes(id)
        ? [...current, id]
        : current,
    );
  }
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        isBusy ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
      )
        return;
      if (
        event.key === "Enter" &&
        !event.repeat &&
        !event.isComposing &&
        selected.length === puzzle.word.length &&
        !(target instanceof HTMLElement && target.closest('[role="dialog"]'))
      ) {
        event.preventDefault();
        prepareGameAudio();
        checkButton.current?.click();
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setSelected((current) => current.slice(0, -1));
      } else if (/^[a-z]$/i.test(event.key)) {
        const value = event.key.toLowerCase();
        setSelected((current) => {
          const letter = letters.find(
            (item) => item.value === value && !current.includes(item.id),
          );
          return letter && current.length < puzzle.word.length
            ? [...current, letter.id]
            : current;
        });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isBusy, letters, puzzle.word.length, selected.length]);
  function beginDrag(event: PointerEvent<HTMLButtonElement>, id: number) {
    if (event.button !== 0) return;
    drag.current = { id, x: event.clientX, y: event.clientY, hasMoved: false };
    shouldSuppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active) return;
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 6) {
      active.hasMoved = true;
      setDragging({
        id: active.id,
        x: event.clientX,
        y: event.clientY,
        size: event.currentTarget.getBoundingClientRect().width,
      });
    }
  }
  function endDrag(
    event: PointerEvent<HTMLButtonElement>,
    isCancelled = false,
  ) {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    setDragging(null);
    if (!active.hasMoved) return;
    shouldSuppressClick.current = true;
    const area = answerArea.current?.getBoundingClientRect();
    if (
      !isCancelled &&
      area &&
      event.clientX >= area.left &&
      event.clientX <= area.right &&
      event.clientY >= area.top &&
      event.clientY <= area.bottom
    )
      addLetter(active.id);
  }
  function speak(text: string) {
    prepareGameAudio();
    speakWord(text, state?.options.speechRate ?? "gentle", () =>
      setMessage(`The word is ${puzzle.word}.`),
    );
  }
  async function checkWord() {
    const guess = selected
      .map((id) => letters.find((letter) => letter.id === id)?.value)
      .join("");
    const isCorrect = guess === puzzle.word;
    playSound(
      isCorrect
        ? session.cursor + 1 === session.questions.length
          ? "win"
          : "correct"
        : "incorrect",
      state?.options.isSoundEnabled,
    );
    const result = await send({
      kind: "activity-answer",
      gameId: "word-builder",
      sessionId: session.id,
      expectedRevision: session.revision,
      answer: guess,
    });
    if (!result) return;
    if (result.outcome === "incorrect") {
      setMessage("Try again! Tap a letter in your word to remove it.");
    } else if (result.outcome === "correct" || result.outcome === "won") {
      stopSpeaking();
    }
  }
  return (
    <>
      <span className="panel-eyebrow">
        WORD {session.cursor + 1} OF {session.questions.length}
      </span>
      <h2>Build the word!</h2>
      <div className="word-builder-prompt">
        {puzzle.picture && (
          <Image
            src={`/assets/picture-cards/${puzzle.picture}.png`}
            alt=""
            width={300}
            height={300}
          />
        )}
        <div>
          <Button className="play-button" onClick={() => speak(puzzle.word)}>
            <Volume2 /> Hear the word
          </Button>
          <Button variant="outline" onClick={() => speak(puzzle.sentence)}>
            Hear a sentence
          </Button>
        </div>
      </div>
      <div
        ref={answerArea}
        className="word-builder-answer"
        aria-label="Your word"
      >
        {Array.from({ length: puzzle.word.length }, (_, slot) => {
          const id = selected[slot];
          const letter = letters.find((item) => item.id === id);
          return letter ? (
            <button
              key={slot}
              type="button"
              disabled={isBusy}
              aria-label={`Remove ${letter.value} from position ${slot + 1}`}
              onClick={() =>
                setSelected((current) => current.filter((_, i) => i !== slot))
              }
            >
              {letter.value}
            </button>
          ) : (
            <span key={slot} aria-hidden="true" />
          );
        })}
      </div>
      <div className="word-builder-letters" aria-label="Available letters">
        {letters.map((letter) => (
          <Button
            key={letter.id}
            variant="outline"
            disabled={selected.includes(letter.id) || isBusy}
            aria-label={`Add ${letter.value}`}
            className={
              dragging?.id === letter.id ? "word-builder-dragging" : undefined
            }
            onPointerDown={(event) => beginDrag(event, letter.id)}
            onPointerMove={moveDrag}
            onPointerUp={(event) => endDrag(event)}
            onPointerCancel={(event) => endDrag(event, true)}
            onClick={() => {
              if (shouldSuppressClick.current) {
                shouldSuppressClick.current = false;
                return;
              }
              addLetter(letter.id);
            }}
          >
            {letter.value}
          </Button>
        ))}
      </div>
      {dragging &&
        createPortal(
          <div
            className="word-builder-drag-ghost"
            aria-hidden="true"
            style={{
              left: dragging.x,
              top: dragging.y,
              width: dragging.size,
              height: dragging.size,
              fontSize: dragging.size * 0.62,
            }}
          >
            {letters.find((letter) => letter.id === dragging.id)?.value}
          </div>,
          document.body,
        )}
      <p role="status" className="word-builder-message">
        {message}
      </p>
      <Button
        ref={checkButton}
        className="play-button coral-button"
        disabled={selected.length !== puzzle.word.length || isBusy}
        onClick={checkWord}
      >
        Check my word
      </Button>
    </>
  );
}
export function WordBuilder() {
  const { state, send, isBusy, error, reload } = useGamePlatform();
  const session = state?.activitySessions.find(
    (item) => item.gameId === "word-builder",
  );
  useEffect(() => () => stopSpeaking(), []);
  async function startGame() {
    prepareGameAudio();
    await send({
      kind: "activity-start",
      gameId: "word-builder",
      worldId: "jungle",
      mode: "default",
    });
  }
  return (
    <GameScene className="word-builder-scene">
      <SceneHeader title="Word Builder" />
      <div className="word-builder-mascot floating-mascot">
        <Mascot pose={session?.phase === "won" ? "cheer" : "wave"} />
      </div>
      <section
        className="word-builder-panel parchment-panel"
        aria-label="Spelling game"
      >
        {error && (
          <p role="alert">
            {error} <Button onClick={reload}>Try again</Button>
          </p>
        )}
        {!state && !error && <p role="status">Getting your words ready…</p>}
        {state && !session && (
          <>
            <span className="panel-eyebrow">A SPELLING ADVENTURE</span>
            <h2>Build a word!</h2>
            <p>Listen to a word and tap the letters to spell it.</p>
            <Button
              className="play-button coral-button"
              disabled={isBusy}
              onClick={startGame}
            >
              Let’s play
            </Button>
          </>
        )}
        {session?.phase === "won" && (
          <>
            <span className="panel-eyebrow">WORD SUPERSTAR</span>
            <h2>You built all five words!</h2>
            <p>One star and 100 points for your collection!</p>
            <Button
              className="play-button coral-button"
              disabled={isBusy}
              onClick={startGame}
            >
              Play again
            </Button>
          </>
        )}
        {session?.phase === "playing" && (
          <WordRound
            key={`${session.id}-${session.cursor}`}
            session={session}
          />
        )}
      </section>
    </GameScene>
  );
}
