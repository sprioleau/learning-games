"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Play, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GameScene,
  SceneHeader,
  RewardStars,
} from "@/components/scene/game-scene";
import { useGamePlatform } from "./game-provider";
import { Celebration } from "./celebration";
import { artwork } from "@/lib/games/artwork";
import { getWorld, worlds } from "@/lib/games/worlds";
import { getWinningLine } from "@/lib/games/bingo";
import {
  prepareGameAudio,
  playSound,
  speakWord,
  stopSpeaking,
  warmBingoVoice,
} from "@/lib/platform/audio";
import { Mascot } from "@/components/hub/mascot";

export function WordBingo() {
  const { state, isBusy, isSavingMoves, error, move, send, reload } =
    useGamePlatform();
  const [feedback, setFeedback] = useState<{
    message: string;
    word: string;
    kind: "correct" | "incorrect";
  } | null>(null);
  const [isSpeechUnavailable, setIsSpeechUnavailable] = useState(false);
  const [isRestartOpen, setIsRestartOpen] = useState(false);
  const [dismissedWinId, setDismissedWinId] = useState<string | null>(null);
  const session = state?.session;
  const target = session?.order[session.cursor];
  const isPlaying = session?.phase === "playing";
  const isWinOpen =
    session?.phase === "won" && !isSavingMoves && dismissedWinId !== session.id;
  const world = getWorld(session?.worldId ?? "jungle");
  const nextWorld = worlds.find(
    (candidate) => candidate.starsRequired > (state?.stars ?? 0),
  );
  const hasJustUnlockedWorld = worlds.some(
    (candidate) =>
      candidate.starsRequired > 0 && candidate.starsRequired === state?.stars,
  );
  const winningLine = session
    ? getWinningLine(session.board, session.marked)
    : null;
  const options = state?.options;
  const speechRate = options?.speechRate;
  useEffect(() => {
    if (session?.board) warmBingoVoice(session.board);
  }, [session?.board]);
  useEffect(() => {
    if (!target || !isPlaying || !speechRate) return;
    const timeout = window.setTimeout(
      () =>
        speakWord(target, speechRate, () => setIsSpeechUnavailable(true), {
          shouldUseRecording: true,
        }),
      450,
    );
    return () => {
      window.clearTimeout(timeout);
      stopSpeaking();
    };
  }, [target, isPlaying, speechRate]);
  async function startNewGame() {
    if (!state) return;
    prepareGameAudio();
    const result = await send({
      kind: "start",
      worldId: world.id,
      options: state.options,
    });
    if (result) {
      setFeedback(null);
      setIsRestartOpen(false);
      setDismissedWinId(null);
    }
  }
  function chooseWord(word: string) {
    if (!session || !state) return;
    prepareGameAudio();
    const result = move(word);
    if (!result || result.outcome === "ignored") return;
    if (result.outcome === "incorrect") {
      setFeedback({
        message: "Good try! Listen again and have another go.",
        word,
        kind: "incorrect",
      });
      playSound("incorrect", state.options.isSoundEnabled);
    } else {
      setFeedback({
        message:
          result.outcome === "won"
            ? "Bingo! You found five in a row!"
            : `Yes! You found ${word}.`,
        word,
        kind: "correct",
      });
      playSound(
        result.outcome === "won" ? "win" : "correct",
        state.options.isSoundEnabled,
      );
    }
  }
  function repeatWord() {
    if (target && options)
      speakWord(
        target,
        options.speechRate,
        () => setIsSpeechUnavailable(true),
        { repeatCount: 2, shouldUseRecording: true },
      );
  }
  return (
    <GameScene
      world={world.id}
      className={`bingo-scene ${session?.phase === "won" ? "has-bingo" : ""}`}
    >
      <SceneHeader title="Word Bingo" />
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error}
          <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {!state && !error && (
        <div className="scene-loading" role="status">
          Finding your words…
        </div>
      )}
      {state && !session && (
        <section className="bingo-intro parchment-panel">
          <span className="panel-eyebrow">YOUR WORD ADVENTURE</span>
          <h2>Listen. Find. Bingo!</h2>
          <p>
            Hear a word, then tap it on your board.
            <br />
            Find five in a row to earn a star!
          </p>
          <Button
            className="play-button"
            disabled={isBusy}
            onClick={startNewGame}
          >
            <Play fill="currentColor" />
            Let’s play
          </Button>
        </section>
      )}
      <div
        className={`bingo-mascot floating-mascot ${feedback?.kind === "correct" ? "is-happy" : ""}`}
      >
        <Mascot
          pose={
            session?.phase === "won"
              ? "cheer"
              : feedback?.kind === "incorrect"
                ? "think"
                : "wave"
          }
        />
      </div>
      {session && (
        <>
          <Button
            variant="ghost"
            className="new-board-button parchment-button"
            onClick={() => setIsRestartOpen(true)}
            disabled={isBusy}
          >
            <RotateCcw />
            New board
          </Button>
          <div className="mascot-speech parchment-panel">
            <strong>
              {session.phase === "won"
                ? "You did it, Explorer!"
                : "You’ve got this!"}
            </strong>
            <span>
              {session.phase === "won"
                ? "Five in a row. Way to go!"
                : "Listen, find the word, and make a row of five."}
            </span>
          </div>
          <Button
            variant="ghost"
            className="word-prompt parchment-panel"
            aria-label="Listen to the word"
            onClick={repeatWord}
            disabled={!isPlaying || (isBusy && !isSavingMoves)}
          >
            <Volume2 aria-hidden="true" />
            <div>
              <span className="prompt-label">
                {isPlaying ? "FIND THE WORD" : "FIVE IN A ROW!"}
              </span>
              <strong>
                {isPlaying ? (
                  options?.hasWordHints || isSpeechUnavailable ? (
                    <span aria-label="Word to find">{target}</span>
                  ) : (
                    "Tap to listen"
                  )
                ) : (
                  "BINGO!"
                )}
              </strong>
            </div>
          </Button>
          <div className="bingo-board-frame">
            <div
              className="bingo-board"
              role="group"
              aria-label="Word board, five rows and five columns"
            >
              {session.board.map((word, index) => {
                const isMarked = session.marked.includes(word);
                const isWinningCell = winningLine?.includes(index);
                const isIncorrect =
                  feedback?.kind === "incorrect" && feedback.word === word;
                return (
                  <Button
                    key={`${session.id}-${word}`}
                    variant="ghost"
                    className={`word-cell ${isMarked ? "is-marked" : ""} ${isWinningCell ? "is-winning" : ""} ${isIncorrect ? "is-incorrect" : ""}`}
                    aria-label={word}
                    aria-pressed={isMarked}
                    disabled={
                      isMarked || !isPlaying || (isBusy && !isSavingMoves)
                    }
                    onClick={() => void chooseWord(word)}
                  >
                    <span>{word}</span>
                    {isMarked && <Check aria-hidden="true" />}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="speaker-station">
            <Button
              className="hear-again-button"
              aria-label="Hear the word again"
              onClick={repeatWord}
              disabled={!isPlaying || (isBusy && !isSavingMoves)}
            >
              <Volume2 />
            </Button>
            <span>
              Hear
              <br />
              again
            </span>
          </div>
          <div className="words-found parchment-panel">
            <Image src={artwork.rewardStar} alt="" width={80} height={80} />
            <span>
              <strong>{session.marked.length}</strong> words found
            </span>
          </div>
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`bingo-feedback parchment-panel ${feedback?.kind ?? ""}`}
          >
            <Sparkles />
            {isSpeechUnavailable && isPlaying
              ? "Find the word above. Ask a grown-up to read it aloud."
              : (feedback?.message ??
                "Listen closely. Your next word is waiting!")}
          </div>
          {session.phase === "won" && !isSavingMoves && (
            <div className="completed-banner parchment-panel">
              <strong>Your star is saved.</strong>
              <Button
                className="play-button"
                onClick={startNewGame}
                disabled={isBusy}
              >
                <Play />
                Play again
              </Button>
            </div>
          )}
        </>
      )}
      {isWinOpen && (
        <Dialog
          key={session?.id}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen && session) setDismissedWinId(session.id);
          }}
        >
          <DialogContent
            className={`win-scene-dialog ${options?.isCelebrationEnabled ? "" : "is-still"}`}
          >
            {options?.isCelebrationEnabled && isWinOpen && <Celebration />}
            <div className="win-sunburst" aria-hidden="true" />
            <div className="win-mascot floating-mascot">
              <Mascot pose="cheer" />
            </div>
            <div className="celebration-ribbon">
              <DialogTitle>Biiig bingo moment!</DialogTitle>
            </div>
            <div className="celebration-stars">
              <RewardStars count={5} />
            </div>
            <div className="win-reward-card parchment-panel">
              <span className="panel-eyebrow">GREAT JOB, EXPLORER!</span>
              <DialogDescription>
                You found five in a row.
                <br />
                One shiny new star, just for you.
              </DialogDescription>
              <div className="win-rewards">
                <span>
                  <Image
                    src={artwork.rewardStar}
                    alt=""
                    width={64}
                    height={64}
                  />
                  +1 star
                </span>
                <span>
                  <Sparkles />+{(session?.marked.length ?? 0) * 10 + 50} points
                </span>
              </div>
              <p>
                {hasJustUnlockedWorld
                  ? "A new world is ready to explore!"
                  : nextWorld
                    ? `${nextWorld.starsRequired - (state?.stars ?? 0)} more stars until your next world!`
                    : "Every world is yours. Keep exploring!"}
              </p>
              <Button
                className="play-button coral-button"
                disabled={isBusy}
                onClick={startNewGame}
              >
                <Play fill="currentColor" />
                Play again
              </Button>
              <Link className="return-map-link" href="/">
                Back to my adventure
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={isRestartOpen} onOpenChange={setIsRestartOpen}>
        <DialogContent className="story-dialog">
          <DialogTitle>A fresh board?</DialogTitle>
          <DialogDescription>
            Your current board will be replaced. All your earned stars and
            points stay safe.
          </DialogDescription>
          <Button
            className="play-button"
            disabled={isBusy}
            onClick={startNewGame}
          >
            Start a new board
          </Button>
          <Button variant="outline" onClick={() => setIsRestartOpen(false)}>
            Keep playing this board
          </Button>
        </DialogContent>
      </Dialog>
    </GameScene>
  );
}
