"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Compass,
  Gamepad2,
  HelpCircle,
  Home,
  LockKeyhole,
  Play,
  Star,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGamePlatform } from "@/components/games/game-provider";
import { Leaderboard } from "@/components/games/leaderboard";
import {
  GameScene,
  SceneHeader,
  RewardStars,
} from "@/components/scene/game-scene";
import { worlds, type WorldId } from "@/lib/games/worlds";
import { prepareGameAudio } from "@/lib/platform/audio";
import { artwork } from "@/lib/games/artwork";
import { Mascot } from "./mascot";

export function Hub() {
  const router = useRouter();
  const { state, storage, isBusy, error, send, reload } = useGamePlatform();
  const [view, setView] = useState<"games" | "map" | "stars">("games");
  const [pendingWorld, setPendingWorld] = useState<WorldId | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const stars = state?.stars ?? 0;
  const nextWorld = worlds.find((world) => world.starsRequired > stars);
  const hasActiveSession = state?.session?.phase === "playing";
  async function startGame(worldId: WorldId = "jungle", shouldReplace = false) {
    if (!state) return;
    prepareGameAudio();
    if (hasActiveSession && !shouldReplace) {
      if (state.session?.worldId === worldId) {
        router.push("/play/word-bingo");
        return;
      }
      setPendingWorld(worldId);
      return;
    }
    const result = await send({
      kind: "start",
      worldId,
      options: state.options,
    });
    if (result) {
      setPendingWorld(null);
      router.push("/play/word-bingo");
    }
  }
  return (
    <GameScene className={`hub-scene view-${view}`}>
      <SceneHeader>
        <nav className="scene-nav" aria-label="Main navigation">
          {(
            [
              ["games", Home, "Let’s play"],
              ["map", Compass, "Adventure map"],
              ["stars", Star, "My stars"],
            ] as const
          ).map(([id, Icon, label]) => (
            <Button
              key={id}
              variant="ghost"
              className={view === id ? "is-active" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}
            >
              <Icon />
              <span>{label}</span>
            </Button>
          ))}
        </nav>
      </SceneHeader>
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error}
          <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {!state && !error && (
        <div className="scene-loading" role="status">
          Packing your adventure…
        </div>
      )}
      {view !== "stars" && (
        <>
          <section className="explorer-greeting">
            <h1>
              {view === "map" ? "A world of discovery!" : "Hi, Explorer!"}
            </h1>
            <p>
              {view === "map" ? (
                "Pick a place. Let your curiosity lead the way."
              ) : (
                <>
                  Let’s play and earn stars on
                  <br />
                  your learning adventure!
                </>
              )}
            </p>
          </section>
          <div className="hub-mascot floating-mascot">
            <Mascot />
          </div>
          {view === "games" && (
            <article className="bingo-game-sign">
              <span className="game-sign-kicker">YOUR NEXT ADVENTURE</span>
              <div className="bingo-sign-icon" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index}>
                    {index === 4 && (
                      <Image
                        src={artwork.rewardStar}
                        alt=""
                        width={64}
                        height={64}
                      />
                    )}
                  </span>
                ))}
              </div>
              <h2>Word Bingo</h2>
              <p>Listen. Find. Make a row!</p>
              <Button
                className="play-button coral-button"
                disabled={!state || isBusy}
                onClick={() => {
                  prepareGameAudio();
                  if (hasActiveSession) router.push("/play/word-bingo");
                  else void startGame();
                }}
              >
                <Play fill="currentColor" />
                {isBusy
                  ? "Getting ready…"
                  : hasActiveSession
                    ? "Keep playing"
                    : "Let’s play"}
              </Button>
              <span className="sign-spark spark-one" aria-hidden="true">
                ✦
              </span>
              <span className="sign-spark spark-two" aria-hidden="true">
                ✦
              </span>
            </article>
          )}
          <section className="adventure-map" aria-label="Adventure map">
            <h2 className="sr-only">Your adventure map</h2>
            <svg
              className="island-trail"
              viewBox="0 0 800 800"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M200 150 C450 10 740 120 580 260 S40 280 200 430 S740 400 590 530 S240 520 400 705" />
            </svg>
            {worlds.map((world) => {
              const isUnlocked = stars >= world.starsRequired;
              return (
                <div
                  key={world.id}
                  className={`map-island island-${world.id} ${isUnlocked ? "is-unlocked" : "is-locked"}`}
                >
                  <Button
                    variant="ghost"
                    className="island-button"
                    disabled={!state || !isUnlocked || isBusy}
                    aria-label={
                      isUnlocked
                        ? `Play Word Bingo in ${world.name}`
                        : `${world.name}, unlocks at ${world.starsRequired} stars`
                    }
                    onClick={() => void startGame(world.id)}
                  >
                    <Image
                      src={artwork.islands[world.id]}
                      alt=""
                      width={768}
                      height={768}
                      sizes="(max-width: 720px) 20vw, 280px"
                    />
                    <span className="island-label">
                      {!isUnlocked && <LockKeyhole />}
                      {world.shortName}
                    </span>
                    <span className="island-requirement">
                      {isUnlocked ? (
                        <>
                          <Star fill="currentColor" />
                          {world.starsRequired === 0
                            ? "Let’s explore!"
                            : "Unlocked!"}
                        </>
                      ) : (
                        `${world.starsRequired} stars`
                      )}
                    </span>
                  </Button>
                </div>
              );
            })}
            <span className="map-compass" aria-hidden="true">
              <Compass />
            </span>
          </section>
          <div className="journey-milestone parchment-panel">
            <Image src={artwork.rewardStar} alt="" width={80} height={80} />
            <div>
              <strong>
                {nextWorld ? "Earn 5 stars" : "Every world is yours!"}
              </strong>
              <span>
                {nextWorld
                  ? "to unlock the next world!"
                  : "Keep the discoveries coming."}
              </span>
            </div>
            <RewardStars count={nextWorld ? stars % 5 : 5} />
            <span className="milestone-fraction">
              {nextWorld ? stars % 5 : 5}/5
            </span>
          </div>
        </>
      )}
      {view === "stars" && (
        <>
          <div className="collection-mascot floating-mascot">
            <Mascot pose="cheer" />
          </div>
          <section className="star-collection parchment-panel">
            <span className="panel-eyebrow">YOUR EXPLORER COLLECTION</span>
            <h1>My shiny stars</h1>
            <p>Every little discovery is a big win.</p>
            <div className="reward-totals">
              <div>
                <Image
                  src={artwork.rewardStar}
                  alt=""
                  width={100}
                  height={100}
                />
                <strong>{stars}</strong>
                <span>stars collected</span>
              </div>
              <div>
                <Trophy />
                <strong>{state?.points ?? 0}</strong>
                <span>discovery points</span>
              </div>
            </div>
            <Leaderboard
              entries={(state?.results ?? []).map((result) => ({
                id: result.sessionId,
                label: "Word Bingo",
                points: result.points,
                completedAt: result.completedAt,
              }))}
            />
            <Button
              className="play-button"
              disabled={!state || isBusy}
              onClick={() => {
                prepareGameAudio();
                if (hasActiveSession) router.push("/play/word-bingo");
                else void startGame();
              }}
            >
              <Gamepad2 />
              Go on an adventure
            </Button>
          </section>
        </>
      )}
      <footer className="scene-footer">
        <span>
          {storage === "cloud"
            ? "Your adventure is saved."
            : "Saved on this device."}
        </span>
        <Button
          variant="ghost"
          aria-label="A note for grown-ups"
          onClick={() => setIsHelpOpen(true)}
        >
          <HelpCircle />
          <span>For grown-ups</span>
        </Button>
      </footer>
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="story-dialog">
          <DialogTitle>A little space to learn</DialogTitle>
          <DialogDescription>
            Listen to a word and find it on the board. Five across, down, or
            diagonally earns a star. There’s no timer to beat and no points lost
            for trying.
          </DialogDescription>
          <p>
            A grown-up can repeat the word or turn on word hints in settings.
          </p>
          <p className="small-note">
            No login needed. Progress is linked to this browser. Clearing
            cookies or changing devices starts a separate adventure.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingWorld !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingWorld(null);
        }}
      >
        <DialogContent className="story-dialog">
          <DialogTitle>Start a new adventure?</DialogTitle>
          <DialogDescription>
            Your current board will be replaced. Your stars and points stay
            safe.
          </DialogDescription>
          <Button
            className="play-button"
            disabled={isBusy}
            onClick={() => {
              if (pendingWorld) void startGame(pendingWorld, true);
            }}
          >
            Start a new board
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPendingWorld(null);
              router.push("/play/word-bingo");
            }}
          >
            Keep my current board
          </Button>
        </DialogContent>
      </Dialog>
    </GameScene>
  );
}
