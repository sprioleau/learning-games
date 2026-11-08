/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { GameProvider } from "./game-provider";
import { MathDrops } from "./math-drops";
vi.mock("@/components/scene/game-scene", () => ({
  GameScene: function GameScene({ children }: { children: ReactNode }) {
    return <main>{children}</main>;
  },
  SceneHeader: function SceneHeader() {
    return null;
  },
}));
vi.mock("@/components/games/celebration", () => ({
  Celebration: function Celebration() {
    return null;
  },
}));
vi.mock("@/lib/platform/audio", () => ({
  prepareGameAudio: vi.fn(),
  playSound: vi.fn(),
  warmMathExpression: vi.fn(),
}));
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Math Drops", () => {
  it("restores an unfinished round and saves a single reward after completion", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ storage: "device" }),
      }),
    );
    const user = userEvent.setup();
    render(
      <GameProvider>
        <MathDrops />
      </GameProvider>,
    );
    const start = await screen.findByRole("button", { name: "Start playing" });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    const answer = screen.getByRole("textbox", { name: "Your answer" });
    await user.type(answer, "2{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Not quite");
    await user.type(answer, "0{Enter}");
    expect(screen.getByText("1 / 8 solved")).toBeInTheDocument();
    cleanup();
    render(
      <GameProvider>
        <MathDrops />
      </GameProvider>,
    );
    await screen.findByText("1 / 8 solved");
    for (let index = 0; index < 7; index++)
      await user.type(
        screen.getByRole("textbox", { name: "Your answer" }),
        "0{Enter}",
      );
    expect(
      screen.getByRole("dialog", { name: "Splash-tastic!" }),
    ).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem("learning-games:player:v1")!);
    expect(saved.stars).toBe(1);
    expect(saved.points).toBe(80);
  });
});
