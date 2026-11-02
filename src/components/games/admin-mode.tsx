"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LockKeyhole, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameScene, SceneHeader } from "@/components/scene/game-scene";
import { useGamePlatform } from "./game-provider";
import { Mascot } from "@/components/hub/mascot";
import { artwork } from "@/lib/games/artwork";
import { worlds, type WorldId } from "@/lib/games/worlds";

export function AdminMode() {
  const router = useRouter();
  const { state, isAdminMode, isBusy, send, reload } = useGamePlatform();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameId, setGameId] = useState<"word-bingo" | "card-matching">(
    "word-bingo",
  );
  const [wordSet, setWordSet] = useState<"starter" | "sight">("starter");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPassword("");
      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not open demo mode.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  async function logout() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin", { method: "DELETE" });
      if (!response.ok)
        throw new Error("Could not end demo mode. Please try again.");
      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not end demo mode.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  async function startDemo(worldId: WorldId) {
    if (!state) return;
    const result =
      gameId === "card-matching"
        ? await send({ kind: "matching-start", worldId })
        : await send({
            kind: "start",
            worldId,
            options: { ...state.options, wordSet, hasWordHints: true },
          });
    if (result)
      router.push(
        gameId === "card-matching" ? "/play/card-matching" : "/play/word-bingo",
      );
  }
  return (
    <GameScene className="admin-scene">
      <SceneHeader title="Grown-up room" />
      <div className="admin-mascot floating-mascot">
        <Mascot pose="think" />
      </div>
      <section className="admin-panel parchment-panel">
        {!isAdminMode ? (
          <>
            <LockKeyhole className="admin-shield" />
            <h1>Demo & testing mode</h1>
            <p>A grown-up password opens every world.</p>
            <form onSubmit={login}>
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button
                type="submit"
                className="play-button"
                disabled={isSubmitting || isBusy || !state}
              >
                {isSubmitting ? "Opening…" : "Unlock demo mode"}
              </Button>
            </form>
            <p className="small-note">
              Your child’s stars and saved progress stay separate.
            </p>
          </>
        ) : (
          <>
            <span className="panel-eyebrow">
              <ShieldCheck /> ADMIN MODE ACTIVE
            </span>
            <h1>Every world is ready!</h1>
            <p>All five worlds are ready to explore.</p>
            <div
              className="admin-levels"
              role="group"
              aria-label="Choose a game"
            >
              {(
                [
                  ["word-bingo", "Word Bingo"],
                  ["card-matching", "Picture Pairs"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  variant="outline"
                  aria-pressed={gameId === id}
                  onClick={() => setGameId(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {gameId === "word-bingo" && (
              <div
                className="admin-levels"
                role="group"
                aria-label="Word collection"
              >
                {(
                  [
                    ["starter", "Starter words"],
                    ["sight", "Sight words"],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    variant="outline"
                    aria-pressed={wordSet === id}
                    onClick={() => setWordSet(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
            <div className="admin-world-grid">
              {worlds.map((world) => (
                <Button
                  key={world.id}
                  variant="ghost"
                  disabled={isBusy || isSubmitting}
                  aria-label={`Demo ${world.name}`}
                  onClick={() => void startDemo(world.id)}
                >
                  <Image
                    src={artwork.islands[world.id]}
                    alt=""
                    width={160}
                    height={160}
                  />
                  <strong>{world.shortName}</strong>
                  <span>
                    <Play />
                    Play
                  </span>
                </Button>
              ))}
            </div>
            <div className="admin-actions">
              <Link href="/" className="parchment-button">
                Open unlocked map
              </Link>
              <Button
                variant="outline"
                disabled={isBusy || isSubmitting}
                onClick={logout}
              >
                {isSubmitting ? "Ending…" : "Exit demo mode"}
              </Button>
            </div>
            <p className="small-note">
              Demo progress is separate. Access expires after eight hours.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
      </section>
    </GameScene>
  );
}
