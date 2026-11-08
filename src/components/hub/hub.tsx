"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Compass,
  ChevronLeft,
  ChevronRight,
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
import { getWorld, worlds, type WorldId } from "@/lib/games/worlds";
import { prepareGameAudio } from "@/lib/platform/audio";
import { artwork } from "@/lib/games/artwork";
import { gameRegistry } from "@/lib/platform/contracts";
import { Mascot } from "./mascot";
import "./world-unlock.css";

const unlockStorageKey = "learning-games:world-unlocks:v1";

type UnlockProgress = { observedStars: number; pendingWorldIds: WorldId[] };

function trackWorldUnlocks(stars: number): WorldId[] {
  try {
    const saved = localStorage.getItem(unlockStorageKey);
    const progress = saved ? (JSON.parse(saved) as UnlockProgress) : null;
    const hasValidProgress =
      progress &&
      Number.isFinite(progress.observedStars) &&
      Array.isArray(progress.pendingWorldIds);
    const pendingWorldIds =
      hasValidProgress && stars >= progress.observedStars
        ? progress.pendingWorldIds.filter((id) =>
            worlds.some(
              (world) => world.id === id && world.starsRequired <= stars,
            ),
          )
        : [];
    if (hasValidProgress && stars >= progress.observedStars) {
      for (const world of worlds) {
        if (
          world.starsRequired > progress.observedStars &&
          world.starsRequired <= stars &&
          !pendingWorldIds.includes(world.id)
        ) {
          pendingWorldIds.push(world.id);
        }
      }
    }
    localStorage.setItem(
      unlockStorageKey,
      JSON.stringify({ observedStars: stars, pendingWorldIds }),
    );
    return pendingWorldIds;
  } catch {
    return [];
  }
}

function acknowledgeWorldUnlock(worldId: WorldId) {
  try {
    const saved = localStorage.getItem(unlockStorageKey);
    if (!saved) return;
    const progress = JSON.parse(saved) as UnlockProgress;
    progress.pendingWorldIds = progress.pendingWorldIds.filter(
      (id) => id !== worldId,
    );
    localStorage.setItem(unlockStorageKey, JSON.stringify(progress));
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}

function Chain({ isReversed }: { isReversed: boolean }) {
  return (
    <svg
      className={`world-chain ${isReversed ? "world-chain-two" : "world-chain-one"}`}
      viewBox="0 0 200 140"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true"
    >
      {Array.from({ length: 21 }, (_, index) => {
        const progress = index / 20;
        const x = 10 + progress * 180;
        const y =
          (isReversed ? 100 - progress * 70 : 30 + progress * 70) +
          20 * Math.sin(Math.PI * progress);
        const slope =
          (isReversed ? -70 : 70) + 20 * Math.PI * Math.cos(Math.PI * progress);
        const angle = (Math.atan2(slope, 180) * 180) / Math.PI;
        return (
          <g key={index} transform={`translate(${x} ${y}) rotate(${angle})`}>
            <ellipse
              rx="7.2"
              ry={index % 2 ? "3.2" : "4.2"}
              fill="none"
              stroke="#795019"
              strokeWidth="3.8"
            />
            <ellipse
              rx="7.2"
              ry={index % 2 ? "3.2" : "4.2"}
              fill="none"
              stroke={index % 2 ? "#e8ab34" : "#ffd878"}
              strokeWidth="2.1"
            />
          </g>
        );
      })}
    </svg>
  );
}

function LockDecoration({
  isCelebrating = false,
}: {
  isCelebrating?: boolean;
}) {
  return (
    <span
      className={`world-lock-decoration ${isCelebrating ? "is-celebrating" : ""}`}
      aria-hidden="true"
    >
      <Chain isReversed={false} />
      <Chain isReversed />
      <Image
        className="world-padlock world-padlock-closed"
        src="/assets/map/padlock-closed.webp"
        alt=""
        width={192}
        height={192}
      />
      {isCelebrating && (
        <Image
          className="world-padlock world-padlock-open"
          src="/assets/map/padlock-open.webp"
          alt=""
          width={192}
          height={192}
        />
      )}
    </span>
  );
}

export function Hub() {
  const router = useRouter();
  const carousel = useRef<HTMLDivElement>(null);
  const { state, storage, isBusy, isAdminMode, error, send, reload } =
    useGamePlatform();
  const [view, setView] = useState<"games" | "map" | "stars">("games");
  const [pendingWorld, setPendingWorld] = useState<WorldId | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<WorldId[]>([]);
  const observedStars = state?.stars;
  useEffect(() => {
    if (observedStars === undefined || isAdminMode) return;
    const frame = requestAnimationFrame(() =>
      setUnlockQueue(trackWorldUnlocks(observedStars)),
    );
    return () => cancelAnimationFrame(frame);
  }, [observedStars, isAdminMode]);
  const celebratingWorld =
    view === "map" && !isAdminMode && unlockQueue.length
      ? getWorld(unlockQueue[0])
      : null;
  useEffect(() => {
    if (!celebratingWorld) return;
    const timer = window.setTimeout(
      () => {
        acknowledgeWorldUnlock(celebratingWorld.id);
        setUnlockQueue((queue) =>
          queue.filter((id) => id !== celebratingWorld.id),
        );
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 1200
        : 5000,
    );
    return () => window.clearTimeout(timer);
  }, [celebratingWorld]);
  const stars = state?.stars ?? 0;
  const nextWorld = worlds.find((world) => world.starsRequired > stars);
  const hasActiveSession = state?.session?.phase === "playing";
  const latestSession = [
    state?.session,
    state?.matchingSession,
    ...(state?.activitySessions ?? []),
  ]
    .filter((session) => session != null)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const currentWorld = getWorld(latestSession?.worldId ?? "jungle");
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
            <>
              <section className="game-picker" aria-label="Choose a game">
                <h2>Choose your game!</h2>
                <div className="game-carousel-controls">
                  <Button
                    variant="outline"
                    aria-label="Previous games"
                    onClick={() =>
                      carousel.current?.scrollBy({
                        left: -carousel.current.clientWidth * 0.7,
                        behavior: "smooth",
                      })
                    }
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    aria-label="More games"
                    onClick={() =>
                      carousel.current?.scrollBy({
                        left: carousel.current.clientWidth * 0.7,
                        behavior: "smooth",
                      })
                    }
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <div
                  ref={carousel}
                  className="game-carousel"
                  tabIndex={0}
                  aria-label="Games, scroll for more"
                >
                  <article className="bingo-game-sign">
                    <span className="game-sign-kicker">
                      YOUR NEXT ADVENTURE
                    </span>
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
                      disabled={isBusy}
                      onClick={() => {
                        prepareGameAudio();
                        if (!state || hasActiveSession)
                          router.push("/play/word-bingo");
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
                  <article className="bingo-game-sign matching-game-sign">
                    <span className="game-sign-kicker">A MEMORY ADVENTURE</span>
                    <div className="matching-sign-icon" aria-hidden="true">
                      <span>
                        <Image
                          src={artwork.rewardStar}
                          alt=""
                          width={64}
                          height={64}
                        />
                      </span>
                      <span>
                        <Image
                          src={artwork.rewardStar}
                          alt=""
                          width={64}
                          height={64}
                        />
                      </span>
                    </div>
                    <h2>Picture Pairs</h2>
                    <p>Flip, remember, match!</p>
                    <Button
                      className="play-button"
                      aria-label="Play Picture Pairs"
                      disabled={isBusy}
                      onClick={() => {
                        prepareGameAudio();
                        router.push("/play/card-matching");
                      }}
                    >
                      <Play fill="currentColor" />
                      Play
                    </Button>
                    <span className="sign-spark spark-one" aria-hidden="true">
                      ✦
                    </span>
                  </article>
                  {[
                    {
                      title: "Math Drops",
                      description: "Catch a falling math challenge!",
                      symbol: "3 + 2",
                      tone: "blue",
                      path: "/play/math-drops",
                    },
                    {
                      title: "Word Builder",
                      description: "Listen, tap, and spell!",
                      symbol: "A B C",
                      tone: "pink",
                      path: "/play/word-builder",
                    },
                    {
                      title: "Fraction Café",
                      description: "Share a tasty fraction!",
                      symbol: "½",
                      tone: "orange",
                      path: "/play/fraction-cafe",
                    },
                    {
                      title: "Number Trail",
                      description: "Take a hop along the numbers!",
                      symbol: "1  2  3",
                      tone: "green",
                      path: "/play/number-trail",
                    },
                    {
                      title: "Jungle Jigsaw",
                      description: "Piece together a jungle adventure!",
                      symbol: "🧩",
                      tone: "green",
                      path: "/play/jigsaw",
                    },
                  ].map((game) => (
                    <article
                      key={game.path}
                      className={`bingo-game-sign game-tile-${game.tone}`}
                    >
                      <span className="game-sign-kicker">
                        A LEARNING ADVENTURE
                      </span>
                      <div className="game-tile-symbol" aria-hidden="true">
                        {game.symbol}
                      </div>
                      <h2>{game.title}</h2>
                      <p>{game.description}</p>
                      <Button
                        className="play-button"
                        aria-label={`Play ${game.title}`}
                        onClick={() => {
                          prepareGameAudio();
                          router.push(game.path);
                        }}
                      >
                        <Play fill="currentColor" /> Play
                      </Button>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
          {view === "map" && (
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
                const isUnlocked = isAdminMode || stars >= world.starsRequired;
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
                      {!isUnlocked && <LockDecoration />}
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
          )}
          <div className="journey-milestone parchment-panel">
            {view === "games" && (
              <button
                type="button"
                className="world-preview"
                onClick={() => setView("map")}
              >
                <Image
                  src={artwork.islands[currentWorld.id]}
                  alt=""
                  width={160}
                  height={160}
                />
                <span>
                  <small>YOUR LATEST ADVENTURE</small>
                  <strong>{currentWorld.shortName}</strong>
                  <span>Explore the map →</span>
                </span>
              </button>
            )}
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
                label:
                  gameRegistry.find((game) => game.id === result.gameId)
                    ?.title ?? "Adventure",
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
      {celebratingWorld && (
        <div
          className="world-unlock-celebration"
          role="status"
          aria-live="polite"
        >
          <div className="world-unlock-showcase">
            <Image
              src={artwork.islands[celebratingWorld.id]}
              alt=""
              width={768}
              height={768}
            />
            <LockDecoration isCelebrating />
          </div>
          <strong>{celebratingWorld.shortName} unlocked!</strong>
          <Button
            onClick={() => {
              acknowledgeWorldUnlock(celebratingWorld.id);
              setUnlockQueue((queue) =>
                queue.filter((id) => id !== celebratingWorld.id),
              );
            }}
          >
            Continue exploring
          </Button>
        </div>
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
