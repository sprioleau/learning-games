"use client";
import { createContext, useContext } from "react";
export const SceneContainerContext = createContext<HTMLElement | null>(null);
export function useSceneContainer() {
  return useContext(SceneContainerContext);
}
