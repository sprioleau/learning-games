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
import { WordBingo } from "./word-bingo";
import { speakWord } from "@/lib/platform/audio";
import { createPlayerState } from "@/lib/platform/progress";
import { createBingoSession } from "@/lib/games/bingo";
import { defaultOptions } from "@/lib/games/options";
vi.mock("@/lib/platform/audio", () => ({
  playSound: vi.fn(),
  speakWord: vi.fn(),
  stopSpeaking: vi.fn(),
}));
vi.mock("./celebration", () => ({
  Celebration: function Celebration() {
    return null;
  },
}));
function setup() {
  const state = createPlayerState();
  state.options = {
    ...defaultOptions,
    hasWordHints: true,
    isCelebrationEnabled: false,
  };
  const session = createBingoSession(
    "ui-session",
    "jungle",
    state.options,
    () => 0.5,
  );
  session.order = [...session.board];
  state.session = session;
  localStorage.setItem("learning-games:player:v1", JSON.stringify(state));
  render(
    <GameProvider>
      <WordBingo />
    </GameProvider>,
  );
  return { session, user: userEvent.setup() };
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
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
describe("the playable bingo experience", () => {
  it("makes both listening controls repeat the current word twice", async () => {
    const { session, user } = setup();
    await screen.findByRole("button", { name: session.board[0] });
    await user.click(
      screen.getByRole("button", { name: "Hear the word again" }),
    );
    expect(speakWord).toHaveBeenLastCalledWith(
      session.order[0],
      "gentle",
      expect.any(Function),
      { repeatCount: 2 },
    );
    await user.click(
      screen.getByRole("button", { name: "Listen to the word" }),
    );
    expect(speakWord).toHaveBeenLastCalledWith(
      session.order[0],
      "gentle",
      expect.any(Function),
      { repeatCount: 2 },
    );
  });

  it("lets a child retry a wrong answer, finish a row, and retain the star after reload", async () => {
    const { session, user } = setup();
    const first = await screen.findByRole("button", { name: session.board[0] });
    await user.click(screen.getByRole("button", { name: session.board[1] }));
    expect(screen.getByRole("status")).toHaveTextContent("Good try!");
    expect(first).toBeEnabled();
    for (const word of session.board.slice(0, 5))
      await user.click(screen.getByRole("button", { name: word }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("+1 star")).toBeInTheDocument();
    expect(within(dialog).getByText("+100 points")).toBeInTheDocument();
    cleanup();
    render(
      <GameProvider>
        <WordBingo />
      </GameProvider>,
    );
    expect(await screen.findByLabelText("1 star")).toBeInTheDocument();
    expect(
      await screen.findByText("Your star is saved.", { exact: false }),
    ).toBeInTheDocument();
  });
  it("restores an unfinished board and keeps earned marks when settings change", async () => {
    const { session, user } = setup();
    await user.click(
      await screen.findByRole("button", { name: session.board[0] }),
    );
    cleanup();
    render(
      <GameProvider>
        <WordBingo />
      </GameProvider>,
    );
    expect(
      await screen.findByRole("button", { name: session.board[0] }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Game options" }));
    await user.click(
      screen.getByRole("switch", { name: /Show the spoken word/ }),
    );
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Tap to listen")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: session.board[0] }),
    ).toBeDisabled();
  });
  it("asks before replacing an unfinished board and lets the child keep playing", async () => {
    const { session, user } = setup();
    await screen.findByRole("button", { name: session.board[0] });
    await user.click(screen.getByRole("button", { name: "New board" }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(
      "A fresh board?",
    );
    await user.click(
      screen.getByRole("button", { name: "Keep playing this board" }),
    );
    expect(
      screen.getByRole("button", { name: session.board[0] }),
    ).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
