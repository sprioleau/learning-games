"use client";
import { useEffect, useState } from "react";
/* A monotonic active-play timer: hidden tabs and paused games do not accrue time. */
export function useGameTimer(isRunning: boolean) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    let previous = performance.now();
    function resetTick() {
      previous = performance.now();
    }
    document.addEventListener("visibilitychange", resetTick);
    const interval = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) setElapsedMs((value) => value + now - previous);
      previous = now;
    }, 250);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resetTick);
    };
  }, [isRunning]);
  return Math.floor(elapsedMs / 1000);
}
