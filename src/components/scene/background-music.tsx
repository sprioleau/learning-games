"use client";

import { useEffect, useRef } from "react";
import { useGamePlatform } from "@/components/games/game-provider";
import {
  pauseBackgroundMusic,
  prepareBackgroundMusic,
  startBackgroundMusic,
} from "@/lib/platform/music";

export function BackgroundMusic() {
  const { state } = useGamePlatform();
  const isEnabled = state?.options.isMusicEnabled ?? false;
  const isEnabledRef = useRef(isEnabled);
  const hasInteraction = useRef(false);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
    if (!isEnabled) pauseBackgroundMusic();
    else if (hasInteraction.current && !document.hidden) startBackgroundMusic();
  }, [isEnabled]);

  useEffect(() => {
    function handleInteraction() {
      hasInteraction.current = true;
      if (isEnabledRef.current) {
        prepareBackgroundMusic();
        startBackgroundMusic();
      }
    }
    function handleVisibility() {
      if (document.hidden) pauseBackgroundMusic();
      else if (hasInteraction.current && isEnabledRef.current)
        startBackgroundMusic();
    }
    document.addEventListener("pointerdown", handleInteraction, true);
    document.addEventListener("keydown", handleInteraction, true);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("pointerdown", handleInteraction, true);
      document.removeEventListener("keydown", handleInteraction, true);
      document.removeEventListener("visibilitychange", handleVisibility);
      pauseBackgroundMusic();
    };
  }, []);
  return null;
}
