"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Celebration } from "./celebration";
import { useGamePlatform } from "./game-provider";
import {
  GameScene,
  SceneHeader,
  RewardStars,
} from "@/components/scene/game-scene";
import { Mascot } from "@/components/hub/mascot";
import { artwork } from "@/lib/games/artwork";
import { getWorld, worlds, type WorldId } from "@/lib/games/worlds";
import { prepareGameAudio, playSound } from "@/lib/platform/audio";

function getFaceLabel(face: string) {
  if (face.endsWith("star") || face.endsWith("stars"))
    return face.replaceAll("-", " ");
  return `${getWorld(face).shortName} island`;
}
function CardFace({ face }: { face: string }) {
  if (face.endsWith("star") || face.endsWith("stars")) {
    const count =
      [
        "one-star",
        "two-stars",
        "three-stars",
        "four-stars",
        "five-stars",
      ].indexOf(face) + 1;
    return (
      <span
        className={`matching-stars matching-stars-${count}`}
        aria-hidden="true"
      >
        {Array.from({ length: count }, (_, index) => (
          <Image
            key={index}
            src={artwork.rewardStar}
            alt=""
            width={64}
            height={64}
          />
        ))}
      </span>
    );
  }
  return (
    <Image
      src={artwork.islands[getWorld(face).id]}
      alt=""
      width={160}
      height={160}
      sizes="(max-width:720px) 15vw, 150px"
    />
  );
}
export function CardMatching() {
  const {
    state,
    match,
    send,
    isBusy,
    isSavingMatching,
    isAdminMode,
    error,
    reload,
  } = useGamePlatform();
  const soundTimers = useRef<Set<number>>(new Set());
  const clearMismatch = useEffectEvent(() => match(null));
  const [selectedWorld, setSelectedWorld] = useState<WorldId | null>(null);
  const [isRestartOpen, setIsRestartOpen] = useState(false);
  const [dismissedWinId, setDismissedWinId] = useState<string | null>(null);
  const [message, setMessage] = useState("Turn over two cards to find a pair!");
  const session = state?.matchingSession;
  const world = getWorld(session?.worldId ?? selectedWorld ?? "jungle");
  const availableWorlds = worlds.filter(
    (item) => isAdminMode || (state?.stars ?? 0) >= item.starsRequired,
  );
  const isWon = session?.phase === "won" && !isSavingMatching;
  const isWinOpen = isWon && dismissedWinId !== session?.id;
  const hasMismatch = session?.revealed.length === 2;
  useEffect(() => {
    if (!hasMismatch || error) return;
    const timeout = window.setTimeout(() => clearMismatch(), 1250);
    return () => window.clearTimeout(timeout);
  }, [hasMismatch, session?.id, session?.revision, error]);
  useEffect(
    () => () => {
      soundTimers.current.forEach((timer) => window.clearTimeout(timer));
      soundTimers.current.clear();
    },
    [session?.id],
  );
  async function startGame() {
    if (!state) return;
    prepareGameAudio();
    const result = await send({
      kind: "matching-start",
      worldId: selectedWorld ?? world.id,
    });
    if (result) {
      setIsRestartOpen(false);
      setSelectedWorld(null);
      setDismissedWinId(null);
      setMessage("Turn over two cards to find a pair!");
    }
  }
  function chooseCard(index: number) {
    if (!state || !session) return;
    prepareGameAudio();
    const outcome = match(index);
    if (outcome === "ignored") return;
    playSound("flip", state.options.isSoundEnabled);
    const face = getFaceLabel(session.board[index]);
    if (outcome === "flip")
      setMessage(`${face}! Now find its matching friend.`);
    if (outcome === "incorrect" || outcome === "correct" || outcome === "won") {
      setMessage(
        outcome === "incorrect"
          ? `${getFaceLabel(session.board[session.revealed[0]])} and ${face} are different. Remember where they are!`
          : outcome === "won"
            ? "You found every pair!"
            : `A match! You found two ${face} cards.`,
      );
      const timer = window.setTimeout(
        () => {
          soundTimers.current.delete(timer);
          playSound(
            outcome === "won" ? "win" : outcome,
            state.options.isSoundEnabled,
          );
        },
        180,
      );
      soundTimers.current.add(timer);
    }
  }
  return (
    <GameScene world={world.id} className="matching-scene">
      <SceneHeader title="Picture Pairs" />
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error}
          <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {!state && !error && (
        <div className="scene-loading" role="status">
          Finding your cards…
        </div>
      )}
      <div className="matching-mascot floating-mascot">
        <Mascot pose={isWon ? "cheer" : "wave"} />
      </div>
      {!session && state && (
        <section className="matching-intro parchment-panel">
          <span className="panel-eyebrow">A MEMORY ADVENTURE</span>
          <h2>Find the matching friends!</h2>
          <p>
            Turn over two cards. If they match, they stay face up. Find all ten
            pairs!
          </p>
          <div
            className="matching-world-choice"
            role="group"
            aria-label="Choose a world"
          >
            {availableWorlds.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                aria-pressed={(selectedWorld ?? "jungle") === item.id}
                onClick={() => setSelectedWorld(item.id)}
              >
                {item.shortName}
              </Button>
            ))}
          </div>
          <Button
            className="play-button coral-button"
            disabled={isBusy}
            onClick={startGame}
          >
            <Play fill="currentColor" />
            Let’s play
          </Button>
        </section>
      )}
      {session && (
        <>
          <Button
            variant="ghost"
            className="new-board-button parchment-button"
            disabled={isBusy}
            onClick={() => {
              setSelectedWorld(world.id);
              setIsRestartOpen(true);
            }}
          >
            <RotateCcw />
            New game
          </Button>
          <div className="matching-tip parchment-panel">
            <strong>Find the pairs!</strong>
            <span>
              Turn over two cards.
              <br />
              Can you remember where they are?
            </span>
            <div className="matching-score">
              <Image src={artwork.rewardStar} alt="" width={64} height={64} />
              <strong>{session.matched.length / 2} / 10 pairs</strong>
            </div>
            <span className="matching-points">
              {session.matched.length * 5} round points
            </span>
          </div>
          <div className="matching-board-frame">
            <div
              className="matching-board"
              role="group"
              aria-label="Matching cards"
            >
              {session.board.map((face, index) => {
                const isRevealed =
                  session.revealed.includes(index) ||
                  session.matched.includes(index);
                const isMatched = session.matched.includes(index);
                return (
                  <Button
                    key={`${session.id}-${index}`}
                    variant="ghost"
                    className={`matching-card ${isRevealed ? "is-revealed" : ""} ${isMatched ? "is-matched" : ""}`}
                    aria-label={`Card ${index + 1}, ${isRevealed ? `${getFaceLabel(face)}${isMatched ? ", matched" : ""}` : "face down"}`}
                    aria-pressed={isRevealed}
                    disabled={
                      isMatched ||
                      session.revealed.includes(index) ||
                      Boolean(hasMismatch) ||
                      session.phase === "won" ||
                      (isBusy && !isSavingMatching)
                    }
                    onClick={() => chooseCard(index)}
                  >
                    <span className="matching-card-back" aria-hidden="true">
                      ✦
                    </span>
                    {isRevealed && (
                      <span className="matching-card-face">
                        <CardFace face={face} />
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
          <div
            role="status"
            aria-live="polite"
            className="matching-feedback parchment-panel"
          >
            <Sparkles />
            {message}
          </div>
          {isWon && (
            <div className="matching-saved parchment-panel">
              Your star is saved.{" "}
              <Button
                className="play-button"
                onClick={startGame}
                disabled={isBusy}
              >
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
            className={`win-scene-dialog ${state?.options.isCelebrationEnabled ? "" : "is-still"}`}
          >
            {state?.options.isCelebrationEnabled && <Celebration />}
            <div className="win-sunburst" aria-hidden="true" />
            <div className="win-mascot floating-mascot">
              <Mascot pose="cheer" />
            </div>
            <div className="celebration-ribbon">
              <DialogTitle>All pairs found!</DialogTitle>
            </div>
            <div className="celebration-stars">
              <RewardStars count={5} />
            </div>
            <div className="win-reward-card parchment-panel">
              <span className="panel-eyebrow">A MEMORY SUPERSTAR!</span>
              <DialogDescription>
                You matched all ten pairs.
                <br />A shiny star for your collection!
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
                <span>+100 points</span>
              </div>
              <Button
                className="play-button coral-button"
                disabled={isBusy}
                onClick={startGame}
              >
                <Play fill="currentColor" />
                Play again
              </Button>
              <Link href="/" className="return-map-link">
                Back to my adventure
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={isRestartOpen} onOpenChange={setIsRestartOpen}>
        <DialogContent className="story-dialog">
          <DialogTitle>Start a new game?</DialogTitle>
          <DialogDescription>
            Your current cards will be replaced. Your earned stars and points
            stay safe.
          </DialogDescription>
          <div
            className="matching-world-choice"
            role="group"
            aria-label="Choose a world"
          >
            {availableWorlds.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                aria-pressed={(selectedWorld ?? world.id) === item.id}
                onClick={() => setSelectedWorld(item.id)}
              >
                {item.shortName}
              </Button>
            ))}
          </div>
          <Button className="play-button" disabled={isBusy} onClick={startGame}>
            Start a new game
          </Button>
          <Button variant="outline" onClick={() => setIsRestartOpen(false)}>
            Keep playing
          </Button>
        </DialogContent>
      </Dialog>
    </GameScene>
  );
}
