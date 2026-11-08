/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
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
import { playSound, speakWord } from "@/lib/platform/audio";
import { awardCompletion, createPlayerState } from "@/lib/platform/progress";
import { applyBingoMove, createBingoSession } from "@/lib/games/bingo";
import { defaultOptions } from "@/lib/games/options";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/platform/audio", () => ({
  prepareGameAudio: vi.fn(),
  playSound: vi.fn(),
  speakWord: vi.fn(),
  warmBingoVoice: vi.fn(),
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
  vi.clearAllMocks();
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
      { repeatCount: 2, shouldUseRecording: true },
    );
    await user.click(
      screen.getByRole("button", { name: "Listen to the word" }),
    );
    expect(speakWord).toHaveBeenLastCalledWith(
      session.order[0],
      "gentle",
      expect.any(Function),
      { repeatCount: 2, shouldUseRecording: true },
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

describe("cloud feedback before a save completes", () => {
  function setupCloud(markedCount = 0) {
    const state = createPlayerState();
    state.options = {
      ...defaultOptions,
      hasWordHints: true,
      isCelebrationEnabled: false,
    };
    const session = createBingoSession(
      "cloud-session",
      "jungle",
      state.options,
      () => 0.5,
    );
    session.order = [...session.board];
    session.marked = session.board.slice(0, markedCount);
    session.cursor = markedCount;
    session.revision = markedCount;
    state.session = session;
    const replies: Array<(value: unknown) => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init) => {
        if (init?.method === "POST")
          return new Promise((resolve) => {
            replies.push(resolve);
          });
        return Promise.resolve({
          ok: true,
          json: async () => ({ storage: "cloud", state }),
        });
      }),
    );
    render(
      <GameProvider>
        <WordBingo />
      </GameProvider>,
    );
    return { state, session, replies, user: userEvent.setup() };
  }
  it("responds immediately, queues rapid correct answers, and confirms them without replaying sounds", async () => {
    const { state, session, replies, user } = setupCloud();
    await user.click(
      await screen.findByRole("button", { name: session.board[0] }),
    );
    expect(
      screen.getByRole("button", { name: session.board[0] }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(playSound).toHaveBeenLastCalledWith("correct", true);
    await user.click(screen.getByRole("button", { name: session.board[1] }));
    expect(
      screen.getByRole("button", { name: session.board[1] }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(replies).toHaveLength(1);
    const first = awardCompletion(
      state,
      applyBingoMove(session, session.board[0]).session,
    );
    await act(async () => {
      replies[0]({
        ok: true,
        json: async () => ({ state: first, outcome: "correct" }),
      });
    });
    await waitFor(() => expect(replies).toHaveLength(2));
    expect(
      screen.getByRole("button", { name: session.board[1] }),
    ).toHaveAttribute("aria-pressed", "true");
    const second = awardCompletion(
      first,
      applyBingoMove(first.session!, session.board[1]).session,
    );
    await act(async () => {
      replies[1]({
        ok: true,
        json: async () => ({ state: second, outcome: "correct" }),
      });
    });
    expect(playSound).toHaveBeenCalledTimes(2);
  });
  it("restores confirmed marks after a failed save and does not announce a saved star early", async () => {
    const { session, replies, user } = setupCloud(4);
    await user.click(
      await screen.findByRole("button", { name: session.board[4] }),
    );
    expect(
      screen.getByRole("button", { name: session.board[4] }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Your star is saved.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("0 stars")).toBeInTheDocument();
    await act(async () => {
      replies[0]({ ok: false, json: async () => ({ error: "Unavailable" }) });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("didn’t save");
    expect(
      screen.getByRole("button", { name: session.board[4] }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: session.board[3] }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
