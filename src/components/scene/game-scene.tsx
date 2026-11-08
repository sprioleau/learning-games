"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Music2,
  VolumeX,
  Volume2,
} from "lucide-react";
import { prepareGameAudio, speakWord } from "@/lib/platform/audio";
import spokenInstructions from "@/lib/games/spoken-instructions.json";
import "./scene-controls.css";
import {
  pauseBackgroundMusic,
  startBackgroundMusic,
} from "@/lib/platform/music";
import { GameAssetWarmup } from "./game-asset-warmup";
import { useSceneWidth } from "./use-scene-width";
import { Button } from "@/components/ui/button";
import { GameOptionsPanel } from "@/components/games/game-options";
import { useGamePlatform } from "@/components/games/game-provider";
import { Brand } from "@/components/hub/brand";
import { artwork } from "@/lib/games/artwork";
import type { WorldId } from "@/lib/games/worlds";
import { useSceneContainer, SceneContainerContext } from "./scene-context";

export function RewardStars({
  count,
  total = 5,
}: {
  count: number;
  total?: number;
}) {
  return (
    <span
      className="reward-stars"
      role="img"
      aria-label={`${count} of ${total} stars`}
    >
      {Array.from({ length: total }, (_, index) => (
        <Image
          key={index}
          src={artwork.rewardStar}
          width={64}
          height={64}
          alt=""
          className={index < count ? "is-earned" : "is-empty"}
        />
      ))}
    </span>
  );
}
export function GameScene({
  children,
  world = "jungle",
  className = "",
}: {
  children: ReactNode;
  world?: WorldId;
  className?: string;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const sceneWidth = useSceneWidth();
  return (
    <div className="scene-viewport">
      <SceneContainerContext.Provider value={container}>
        <main
          id="main-content"
          ref={setContainer}
          className={`game-scene ${className}`}
          style={
            sceneWidth === null
              ? undefined
              : ({ "--scene-width": `${sceneWidth}px` } as CSSProperties)
          }
          tabIndex={-1}
          aria-label="Learning Games adventure"
          onPointerDownCapture={prepareGameAudio}
          onKeyDownCapture={prepareGameAudio}
        >
          <Image
            className="scene-background"
            src={artwork.backgrounds[world]}
            alt=""
            fill
            sizes="100vw"
            preload
          />
          <div className="scene-vignette" aria-hidden="true" />
          {children}
          <GameAssetWarmup world={world} />
        </main>
      </SceneContainerContext.Provider>
    </div>
  );
}
export function SceneHeader({
  title,
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  const { state, isAdminMode, isBusy, send } = useGamePlatform();
  const container = useSceneContainer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasPendingFullscreen = useRef(false);
  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    const frame = window.requestAnimationFrame(syncFullscreen);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);
  async function toggleFullscreen() {
    if (hasPendingFullscreen.current) return;
    hasPendingFullscreen.current = true;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await container?.parentElement?.requestFullscreen();
        setIsFullscreen(Boolean(document.fullscreenElement));
      }
    } catch {
      setIsFullscreen(false);
    } finally {
      hasPendingFullscreen.current = false;
    }
  }
  async function toggleMusic() {
    if (!state || isBusy) return;
    const isMusicEnabled = !state.options.isMusicEnabled;
    if (!isMusicEnabled) pauseBackgroundMusic();
    const result = await send({
      kind: "options",
      options: { ...state.options, isMusicEnabled },
    });
    if (!result && !isMusicEnabled) startBackgroundMusic();
  }
  function readInstructions() {
    const entry =
      title && spokenInstructions[title as keyof typeof spokenInstructions];
    if (!entry) return;
    speakWord(entry.text, state?.options.speechRate ?? "gentle", undefined, {
      recordingPath: `/assets/audio/instructions/${entry.id}.mp3`,
    });
  }
  return (
    <header className="scene-header">
      {title ? (
        <div className="scene-title-group">
          <Link
            href="/"
            className="scene-icon-button back-button"
            aria-label="All games"
          >
            <ArrowLeft />
          </Link>
          <h1 className="wooden-title">{title}</h1>
          <Button
            variant="ghost"
            className="read-instructions-button"
            onClick={readInstructions}
            aria-label="Hear instructions"
          >
            <Volume2 aria-hidden="true" /> <span>Hear instructions</span>
          </Button>
        </div>
      ) : (
        <Brand variant="stacked" />
      )}
      {children}
      <div className="scene-header-actions">
        {isAdminMode && (
          <Link href="/admin" className="admin-mode-badge">
            Demo mode
          </Link>
        )}
        <span
          className="star-counter"
          role="img"
          aria-label={`${state?.stars ?? 0} ${state?.stars === 1 ? "star" : "stars"}`}
        >
          <Image src={artwork.rewardStar} width={64} height={64} alt="" />
          {state?.stars ?? 0}
        </span>
        <Button
          variant="ghost"
          className="scene-icon-button music-toggle"
          aria-label={
            state?.options.isMusicEnabled ? "Mute music" : "Turn on music"
          }
          aria-pressed={state?.options.isMusicEnabled ?? false}
          disabled={!state || isBusy}
          onClick={toggleMusic}
        >
          {state?.options.isMusicEnabled ? <Music2 /> : <VolumeX />}
          <span>
            {state?.options.isMusicEnabled ? "Mute music" : "Music off"}
          </span>
        </Button>
        <GameOptionsPanel />
        <Button
          variant="ghost"
          className="scene-icon-button fullscreen-button"
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </div>
    </header>
  );
}
