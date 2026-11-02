/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { GameProvider } from "./game-provider";
import { CardMatching } from "./card-matching";
import { createPlayerState } from "@/lib/platform/progress";
import { createMatchingSession, matchingFaces } from "@/lib/games/matching";
import { playSound } from "@/lib/platform/audio";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/platform/audio", () => ({
  prepareGameAudio: vi.fn(),
  playSound: vi.fn(),
  speakWord: vi.fn(),
  stopSpeaking: vi.fn(),
}));
vi.mock("./celebration", () => ({
  Celebration: function Celebration() {
    return null;
  },
}));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ storage: "device" }),
      }),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Picture Pairs", () => {
  it("flips immediately, announces and sounds each card, hides a mismatch, and restores matched cards after reload", async () => {
    const state = createPlayerState();
    const session = createMatchingSession("test-matching", "jungle");
    session.board = matchingFaces.flatMap((face) => [face, face]);
    state.matchingSession = session;
    localStorage.setItem("learning-games:player:v1", JSON.stringify(state));
    const user = userEvent.setup();
    render(
      <GameProvider>
        <CardMatching />
      </GameProvider>,
    );
    const board = await screen.findByRole("group", { name: "Matching cards" });
    await user.click(
      within(board).getByRole("button", { name: "Card 1, face down" }),
    );
    expect(
      within(board).getByRole("button", { name: "Card 1, Jungle island" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Jungle island");
    expect(playSound).toHaveBeenLastCalledWith("flip", true);
    await user.click(
      within(board).getByRole("button", { name: "Card 3, face down" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Jungle island and Desert island are different",
    );
    expect(
      within(board).getByRole("button", { name: "Card 2, face down" }),
    ).toBeDisabled();
    await waitFor(
      () =>
        expect(
          within(board).getByRole("button", { name: "Card 1, face down" }),
        ).toBeEnabled(),
      { timeout: 2500 },
    );
    expect(playSound).toHaveBeenCalledWith("incorrect", true);
    await user.click(
      within(board).getByRole("button", { name: "Card 1, face down" }),
    );
    await user.click(
      within(board).getByRole("button", { name: "Card 2, face down" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("A match!");
    expect(screen.getByText("1 / 10 pairs")).toBeInTheDocument();
    await waitFor(() =>
      expect(playSound).toHaveBeenCalledWith("correct", true),
    );
    cleanup();
    render(
      <GameProvider>
        <CardMatching />
      </GameProvider>,
    );
    expect(
      await screen.findByRole("button", {
        name: "Card 1, Jungle island, matched",
      }),
    ).toBeDisabled();
    expect(screen.getByText("1 / 10 pairs")).toBeInTheDocument();
  }, 10000);
});
