/** @vitest-environment jsdom */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackgroundMusic } from "./background-music";
import { gameOptionsSchema } from "@/lib/games/options";
import {
  pauseBackgroundMusic,
  prepareBackgroundMusic,
  startBackgroundMusic,
} from "@/lib/platform/music";

const platform = vi.hoisted(() => ({ isMusicEnabled: true }));
vi.mock("@/components/games/game-provider", () => ({
  useGamePlatform: () => ({
    state: { options: { isMusicEnabled: platform.isMusicEnabled } },
  }),
}));
vi.mock("@/lib/platform/music", () => ({
  pauseBackgroundMusic: vi.fn(),
  prepareBackgroundMusic: vi.fn(),
  startBackgroundMusic: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  platform.isMusicEnabled = true;
});

describe("background music", () => {
  it("starts after interaction, pauses when disabled, and resumes when enabled", () => {
    const view = render(<BackgroundMusic />);
    expect(startBackgroundMusic).not.toHaveBeenCalled();
    fireEvent.pointerDown(document);
    expect(prepareBackgroundMusic).toHaveBeenCalled();
    expect(startBackgroundMusic).toHaveBeenCalledTimes(1);
    platform.isMusicEnabled = false;
    view.rerender(<BackgroundMusic />);
    expect(pauseBackgroundMusic).toHaveBeenCalled();
    fireEvent.pointerDown(document);
    expect(prepareBackgroundMusic).toHaveBeenCalledTimes(1);
    expect(startBackgroundMusic).toHaveBeenCalledTimes(1);
    platform.isMusicEnabled = true;
    view.rerender(<BackgroundMusic />);
    expect(startBackgroundMusic).toHaveBeenCalledTimes(2);
  });

  it("enables music for older saved settings that lack the preference", () => {
    const oldOptions = { isSoundEnabled: false };
    expect(gameOptionsSchema.parse(oldOptions).isMusicEnabled).toBe(true);
  });
});
