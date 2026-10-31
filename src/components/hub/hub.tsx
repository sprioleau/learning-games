"use client";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { artwork } from "@/lib/games/artwork";
import { Brand } from "./brand";
import {
  ArrowRight,
  Check,
  Compass,
  Gamepad2,
  Leaf,
  LockKeyhole,
  Sparkles,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GameOptionsPanel } from "@/components/games/game-options";
import { useGamePlatform } from "@/components/games/game-provider";
import { Leaderboard } from "@/components/games/leaderboard";
import { worlds, type WorldId } from "@/lib/games/worlds";
import { WorldArt } from "./world-art";

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
    <div className="app-shell">
      <header className="site-header">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          {(
            [
              ["games", Gamepad2, "Let’s play"],
              ["map", Compass, "Adventure map"],
              ["stars", Star, "My stars"],
            ] as const
          ).map(([id, Icon, label]) => (
            <Button
              key={id}
              variant="ghost"
              className={view === id ? "nav-item is-active" : "nav-item"}
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              {label}
            </Button>
          ))}
        </nav>
        <div className="header-actions">
          <span
            className="star-counter"
            role="img"
            aria-label={`${stars} ${stars === 1 ? "star" : "stars"}`}
          >
            <Star size={19} fill="currentColor" />
            {stars}
          </span>
          <GameOptionsPanel />
        </div>
      </header>
      <main id="main-content" className="hub-main">
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          </div>
        )}
        {!state && !error && (
          <p role="status" className="loading-note">
            Getting your adventure ready…
          </p>
        )}
        {view === "games" && (
          <>
            <section className="welcome-hero">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span className="tiny-sun">✳</span> YOUR NEXT LITTLE ADVENTURE
                </p>
                <h1>
                  Hi, Explorer!
                  <br />
                  Let’s <span>discover.</span>
                </h1>
                <p className="hero-description">
                  Follow your curiosity. Find your next favorite game.
                  <br className="desktop-label" /> There’s a whole world to
                  explore.
                </p>
                <div className="hero-footnote">
                  <span>
                    <Check size={15} /> Made for ages 4–6
                  </span>
                  <span>
                    <Leaf size={15} /> Learn at your own pace
                  </span>
                </div>
              </div>
              <div className="hero-illustration">
                <span className="floating-label">
                  Adventure starts here <Sparkles size={16} />
                </span>
                <WorldArt />
                <span className="art-caption">
                  A new discovery is just a play away.
                </span>
              </div>
            </section>
            <section aria-labelledby="games-title" className="games-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PICK A LITTLE ADVENTURE</p>
                  <h2 id="games-title">
                    Ready, set, <span>play!</span>
                  </h2>
                </div>
                <span className="soft-badge">Made for curious kids</span>
              </div>
              <div className="game-layout">
                <article className="featured-game">
                  <div className="bingo-preview" aria-hidden="true">
                    <span className="game-category">WORDS & READING</span>
                    <div className="mini-bingo">
                      {[
                        "cat",
                        "sun",
                        "dog",
                        "hat",
                        "pig",
                        "bus",
                        "cup",
                        "fox",
                        "bed",
                      ].map((word, index) => (
                        <span
                          key={word}
                          className={
                            [0, 4, 8].includes(index) ? "mini-marked" : ""
                          }
                        >
                          {[0, 4, 8].includes(index) ? (
                            <Star size={19} fill="currentColor" />
                          ) : (
                            word
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="preview-spark one">✦</span>
                    <span className="preview-spark two">✧</span>
                    <span className="speaker-sticker">
                      <Volume2 size={25} />
                    </span>
                  </div>
                  <div className="game-card-copy">
                    <div className="game-title-row">
                      <h3>Word Bingo</h3>
                      <span className="age-tag">AGES 4–6</span>
                    </div>
                    <p>
                      Little words. Big bingo moments! Listen, find the word,
                      and make a row of five.
                    </p>
                    <div className="game-card-footer">
                      <span>
                        <Volume2 size={16} /> Listen & learn
                      </span>
                      <Button
                        className="play-button"
                        disabled={!state || isBusy}
                        onClick={() => {
                          if (hasActiveSession) router.push("/play/word-bingo");
                          else void startGame();
                        }}
                      >
                        {isBusy
                          ? "Getting ready…"
                          : hasActiveSession
                            ? "Keep playing"
                            : "Let’s play"}
                        <ArrowRight size={19} />
                      </Button>
                    </div>
                  </div>
                </article>
                <aside className="milestone-card">
                  <div className="milestone-icon">
                    <Star size={36} fill="currentColor" />
                    <span>✦</span>
                  </div>
                  <p className="eyebrow">LITTLE WINS ADD UP</p>
                  <h3>
                    Your next adventure
                    <br />
                    is taking shape.
                  </h3>
                  <p>
                    Every bingo earns a star.
                    <br />
                    Five stars open a whole new world!
                  </p>
                  <div
                    className="five-stars"
                    role="img"
                    aria-label={`${nextWorld ? stars % 5 : 5} of 5 stars toward your next world`}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={27}
                        fill={
                          index < (nextWorld ? stars % 5 : 5)
                            ? "currentColor"
                            : "none"
                        }
                        className={
                          index < (nextWorld ? stars % 5 : 5) ? "has-star" : ""
                        }
                      />
                    ))}
                  </div>
                  <Progress
                    value={nextWorld ? (stars % 5) * 20 : 100}
                    aria-label="Progress to next world"
                  />
                  <p className="milestone-progress">
                    {nextWorld
                      ? `${nextWorld.starsRequired - stars} ${nextWorld.starsRequired - stars === 1 ? "star" : "stars"} to ${nextWorld.shortName}`
                      : "Every world is yours to explore!"}
                  </p>
                  <Button
                    variant="ghost"
                    className="text-button"
                    onClick={() => setView("map")}
                  >
                    See your adventure map <ArrowRight size={16} />
                  </Button>
                </aside>
              </div>
              <div className="coming-next">
                <span className="coming-icon">123</span>
                <div>
                  <strong>More little adventures are growing.</strong>
                  <p>Numbers, shapes, and more. This is just the beginning.</p>
                </div>
                <span className="soft-badge">Coming later</span>
              </div>
            </section>
          </>
        )}
        {(view === "games" || view === "map") && (
          <section
            className={`map-section ${view === "map" ? "full-map" : ""}`}
            aria-labelledby="map-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">ONE STAR AT A TIME</p>
                <h2 id="map-title">
                  Your adventure <span>awaits.</span>
                </h2>
              </div>
              <span className="map-count">
                <Compass size={17} /> 5 worlds to discover
              </span>
            </div>
            <div className="world-map">
              <div className="map-trail" aria-hidden="true" />
              {worlds.map((world, index) => {
                const isUnlocked = stars >= world.starsRequired;
                return (
                  <div
                    key={world.id}
                    className={`world-stop ${index % 2 ? "is-lower" : ""}`}
                    style={
                      {
                        "--world-color": world.color,
                        "--world-ink": world.ink,
                      } as CSSProperties
                    }
                  >
                    <Button
                      variant="ghost"
                      className={`world-node ${isUnlocked ? "is-unlocked" : "is-locked"}`}
                      disabled={!state || !isUnlocked || isBusy}
                      aria-label={
                        isUnlocked
                          ? `Play Word Bingo in ${world.name}`
                          : `${world.name}, unlocks at ${world.starsRequired} stars`
                      }
                      onClick={() => void startGame(world.id)}
                    >
                      <span className="world-emoji" aria-hidden="true">
                        {artwork.islands[world.id] ? (
                          <Image
                            src={artwork.islands[world.id]!}
                            alt=""
                            width={90}
                            height={90}
                          />
                        ) : (
                          world.emoji
                        )}
                      </span>
                      <span className="node-marker">
                        {isUnlocked ? (
                          <Gamepad2 size={15} />
                        ) : (
                          <LockKeyhole size={14} />
                        )}
                      </span>
                    </Button>
                    <strong>{world.shortName}</strong>
                    <span>
                      {isUnlocked
                        ? "Let’s explore!"
                        : `${world.starsRequired} stars`}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="map-bottom">
              <span>
                <span className="green-dot" />{" "}
                {stars >= 20
                  ? "All worlds unlocked"
                  : "Your journey has only just begun"}
              </span>
              <span>No rush. Every adventure starts with one small step.</span>
            </div>
          </section>
        )}
        {view === "stars" && (
          <section className="stars-page">
            <p className="eyebrow">LOOK HOW FAR YOU’VE COME</p>
            <h1>
              Your little <span>victories.</span>
            </h1>
            <div className="reward-totals">
              <div>
                <Star fill="currentColor" />
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
                if (hasActiveSession) router.push("/play/word-bingo");
                else void startGame();
              }}
            >
              Go on an adventure <ArrowRight size={18} />
            </Button>
          </section>
        )}
        <footer className="site-footer">
          <span>
            <Leaf size={16} /> Small steps. Happy discoveries.
          </span>
          <span>
            {storage === "cloud"
              ? "Progress saved · No login needed"
              : "Progress saved on this device"}
          </span>
          <Button
            variant="ghost"
            className="help-button"
            onClick={() => setIsHelpOpen(true)}
          >
            A note for grown-ups <ArrowRight size={14} />
          </Button>
        </footer>
      </main>
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent>
          <DialogTitle>A little space to learn</DialogTitle>
          <DialogDescription>
            Word Bingo helps beginning readers connect spoken and written words.
            A grown-up can play alongside them, repeat the word, or turn on word
            hints in settings.
          </DialogDescription>
          <p>
            Five across, down, or diagonally wins a star. There’s no timer to
            beat and no points lost for trying again.
          </p>
          <p className="small-note">
            Progress is linked to this browser through an anonymous cookie. No
            name or email is collected. Clearing cookies or using another device
            starts a separate adventure.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingWorld !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingWorld(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Start a new adventure?</DialogTitle>
          <DialogDescription>
            Your current bingo board will be replaced. Your collected stars and
            points stay safe.
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
    </div>
  );
}
