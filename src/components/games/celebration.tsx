"use client";
import confetti from "canvas-confetti";
import { CanvasSurface } from "./canvas-surface";
function launchCelebration(canvas: HTMLCanvasElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fire = confetti.create(canvas, { resize: true, useWorker: false });
  void fire({
    particleCount: 130,
    spread: 85,
    origin: { y: 0.7 },
    colors: ["#f8c65d", "#6fa879", "#ef917f", "#8bbdd4"],
    disableForReducedMotion: true,
  });
  return () => fire.reset();
}
export function Celebration() {
  return (
    <CanvasSurface
      label="Celebration confetti"
      className="celebration-canvas"
      onReady={launchCelebration}
    />
  );
}
