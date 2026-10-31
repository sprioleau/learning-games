"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { warmGameArtwork } from "@/lib/platform/artwork-cache";
import type { WorldId } from "@/lib/games/worlds";

export function GameAssetWarmup({ world }: { world: WorldId }) {
  const router = useRouter();
  useEffect(() => {
    function warmAssets() {
      warmGameArtwork(world);
      window.speechSynthesis?.getVoices();
      router.prefetch("/play/word-bingo");
      router.prefetch("/");
    }
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warmAssets, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(warmAssets, 100);
    return () => window.clearTimeout(handle);
  }, [world, router]);
  return null;
}
