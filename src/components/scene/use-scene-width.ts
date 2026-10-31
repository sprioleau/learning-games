"use client";
import { useSyncExternalStore } from "react";

/*
  Viewport units alone cancel browser zoom by continually fitting the scene.
  Keep the initial device scale across client navigation, and compensate the
  viewport measurement for later zoom changes. Container units then scale all
  artwork, typography, controls, and dialogs together. Overflow remains scrollable.
*/
let initialDeviceRatio: number | null = null;
let sceneWidth: number | null = null;
const listeners = new Set<() => void>();
function measureSceneWidth() {
  initialDeviceRatio ??= window.devicePixelRatio || 1;
  const zoom = (window.devicePixelRatio || 1) / initialDeviceRatio;
  const width = Math.min(
    window.innerWidth * zoom,
    (window.innerHeight * zoom * 16) / 9,
    1920,
  );
  if (width === sceneWidth) return;
  sceneWidth = width;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  const shouldStartListening = listeners.size === 0;
  listeners.add(listener);
  if (shouldStartListening) {
    window.addEventListener("resize", measureSceneWidth);
    measureSceneWidth();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0)
      window.removeEventListener("resize", measureSceneWidth);
  };
}
function getSnapshot() {
  return sceneWidth;
}
function getServerSnapshot() {
  return null;
}
export function useSceneWidth() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
