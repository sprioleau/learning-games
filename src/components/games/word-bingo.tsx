"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGamePlatform } from "./game-provider";
import { GameOptionsPanel } from "./game-options";
import { Celebration } from "./celebration";
import { artwork } from "@/lib/games/artwork";
import { getWorld, worlds } from "@/lib/games/worlds";
import { getWinningLine } from "@/lib/games/bingo";
import { playSound, speakWord, stopSpeaking } from "@/lib/platform/audio";
import { Mascot } from "@/components/hub/mascot";
import { WorldArt } from "@/components/hub/world-art";

export function WordBingo() {
  const { state, isBusy, error, send, reload } = useGamePlatform();
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
  const isWinOpen = session?.phase === "won" && dismissedWinId !== session.id;
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
    if (!target || !isPlaying || !speechRate) return;
    const timeout = window.setTimeout(
      () => speakWord(target, speechRate, () => setIsSpeechUnavailable(true)),
      450,
    );
    return () => {
      window.clearTimeout(timeout);
      stopSpeaking();
    };
  }, [target, isPlaying, speechRate]);
  async function startNewGame() {
    if (!state) return;
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
  async function chooseWord(word: string) {
    if (!session || !state) return;
    const result = await send({
      kind: "move",
      sessionId: session.id,
      expectedRevision: session.revision,
      word,
    });
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
      speakWord(target, options.speechRate, () => setIsSpeechUnavailable(true));
  }
  return (
    <div
      className={`game-shell theme-${world.id}`}
      style={
        {
          "--world-color": world.color,
          "--world-ink": world.ink,
          ...(artwork.backgrounds[world.id]
            ? {
                backgroundImage: `url("${artwork.backgrounds[world.id]}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
              }
            : {}),
        } as CSSProperties
      }
    >
      <header className="game-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={20} />
          <span>All games</span>
        </Link>
        <div className="game-heading">
          <h1>Word Bingo</h1>
          <span>
            {world.emoji} {world.name}
          </span>
        </div>
        <div className="header-actions">
          <span
            className="star-counter"
            role="img"
            aria-label={`${state?.stars ?? 0} ${state?.stars === 1 ? "star" : "stars"}`}
          >
            <Star size={19} fill="currentColor" />
            {state?.stars ?? 0}
          </span>
          <GameOptionsPanel />
        </div>
      </header>
      <main id="main-content" className="bingo-main">
        {error && (
          <div role="alert" className="error-banner">
            {error}
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          </div>
        )}
        {!state && !error && <p role="status">Getting your adventure ready…</p>}
        {state && !session && (
          <section className="bingo-intro">
            <WorldArt />
            <p className="eyebrow">WORDS & READING · AGES 4–6</p>
            <h2>
              Listen. Find. <span>Bingo!</span>
            </h2>
            <p>
              Hear a word, then tap it on your board.
              <br />
              Find five across, down, or diagonally to earn a star.
            </p>
            <Button
              className="play-button"
              disabled={isBusy}
              onClick={startNewGame}
            >
              Let’s play <ArrowRight size={20} />
            </Button>
          </section>
        )}
        {session && (
          <>
            <div className="bingo-topline">
              <span className="soft-badge">
                <Sparkles size={14} /> Little words. Big discoveries.
              </span>
              <Button
                variant="ghost"
                className="new-board-button"
                onClick={() => setIsRestartOpen(true)}
                disabled={isBusy}
              >
                <RotateCcw size={16} /> New board
              </Button>
            </div>
            <section className="bingo-play-area" aria-label="Word Bingo game">
              <aside className="bingo-guide">
                <div className="guide-art">
                  <WorldArt world={world.id} />
                </div>
                <p className="eyebrow">YOU’VE GOT THIS, EXPLORER!</p>
                <h2>
                  {isPlaying ? (
                    <>
                      Listen.
                      <br />
                      Find the word.
                      <br />
                      <span>Make a row!</span>
                    </>
                  ) : (
                    <>
                      Five in a row.
                      <br />
                      <span>Way to go!</span>
                    </>
                  )}
                </h2>
                <p>
                  Five across, down, or diagonally.
                  <br />
                  One shiny star for you.
                </p>
                <div className="bingo-progress">
                  <Star size={21} fill="currentColor" />
                  <span>
                    <strong>{session.marked.length}</strong> words found
                  </span>
                </div>
                <span className="no-rush">
                  <span className="green-dot" /> No timer. Take your time.
                </span>
              </aside>
              <div className="board-card">
                <div className="listen-panel">
                  <Button
                    className="speaker-button"
                    aria-label="Hear the word again"
                    onClick={repeatWord}
                    disabled={!isPlaying || isBusy}
                  >
                    <Volume2 size={32} />
                  </Button>
                  <div>
                    <p className="eyebrow">
                      {isPlaying ? "CAN YOU FIND THIS WORD?" : "YOU DID IT!"}
                    </p>
                    <div className="spoken-word">
                      {isPlaying ? (
                        options?.hasWordHints || isSpeechUnavailable ? (
                          <span aria-label="Word to find">{target}</span>
                        ) : (
                          "Tap to listen"
                        )
                      ) : (
                        "BINGO!"
                      )}
                      <span className="sound-lines" aria-hidden="true">
                        ı ıı ı ıı ı
                      </span>
                    </div>
                  </div>
                  <span className="listen-note">
                    {isPlaying
                      ? "Hear it again anytime"
                      : "A star for your collection"}
                  </span>
                </div>
                {isSpeechUnavailable && (
                  <p className="speech-notice" role="status">
                    Your browser couldn’t speak. Find the word shown above, or
                    ask a grown-up to read it aloud.
                  </p>
                )}
                <div className="bingo-letters" aria-hidden="true">
                  {"BINGO".split("").map((letter) => (
                    <span key={letter}>{letter}</span>
                  ))}
                </div>
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
                        variant="outline"
                        className={`word-cell ${isMarked ? "is-marked" : ""} ${isWinningCell ? "is-winning" : ""} ${isIncorrect ? "is-incorrect" : ""}`}
                        aria-label={word}
                        aria-pressed={isMarked}
                        disabled={isMarked || !isPlaying || isBusy}
                        onClick={() => void chooseWord(word)}
                      >
                        <span>{word}</span>
                        {isMarked && <Check size={18} aria-hidden="true" />}
                      </Button>
                    );
                  })}
                </div>
                <div
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className={`game-feedback ${feedback?.kind ?? ""}`}
                >
                  {feedback?.kind === "correct" ? (
                    <Sparkles size={18} />
                  ) : (
                    <span aria-hidden="true">✦</span>
                  )}
                  {feedback?.message ??
                    "Tap the speaker, listen closely, and find the word."}
                </div>
              </div>
            </section>
            {session.phase === "won" && (
              <div className="completed-banner">
                <Star fill="currentColor" />
                <strong>Bingo! Your star is saved.</strong>
                <Button
                  className="play-button"
                  disabled={isBusy}
                  onClick={startNewGame}
                >
                  Play again <ArrowRight size={18} />
                </Button>
              </div>
            )}
          </>
        )}
        <footer className="game-footer">
          <span>Every try helps your brain grow.</span>
          <span>
            Learning Games <span aria-hidden="true">✦</span>
          </span>
        </footer>
      </main>
      <Dialog
        open={Boolean(isWinOpen)}
        onOpenChange={(isOpen) => {
          if (!isOpen && session) setDismissedWinId(session.id);
        }}
      >
        <DialogContent className="win-dialog">
          {options?.isCelebrationEnabled && isWinOpen && <Celebration />}
          <div className="win-mascot">
            <Mascot pose="cheer" />
          </div>
          <div className="reward-star" aria-hidden="true">
            <Image src={artwork.rewardStar} alt="" width={90} height={90} />
          </div>
          <p className="eyebrow">A LITTLE WORD WONDER!</p>
          <DialogTitle>Biiig bingo moment!</DialogTitle>
          <DialogDescription>
            You found five in a row.
            <br />
            One shiny new star, just for you.
          </DialogDescription>
          <div className="win-rewards">
            <span>
              <Star size={20} fill="currentColor" /> +1 star
            </span>
            <span>
              <Sparkles size={20} /> +{(session?.marked.length ?? 0) * 10 + 50}{" "}
              points
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
            className="play-button"
            disabled={isBusy}
            onClick={startNewGame}
          >
            Play again <ArrowRight size={20} />
          </Button>
          <Link className="return-map-link" href="/">
            Back to my adventure
          </Link>
        </DialogContent>
      </Dialog>
      <Dialog open={isRestartOpen} onOpenChange={setIsRestartOpen}>
        <DialogContent>
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
    </div>
  );
}
