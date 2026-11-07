import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineTestApp } from "convex-test";
import schema from "./schema";
import * as players from "./players";
import { defaultOptions } from "../src/lib/games/options";
const app = defineTestApp({ schema }).defineModules({ players });
const secret = "integration-test-secret";
function startCommand(worldId = "jungle") {
  return JSON.stringify({ kind: "start", worldId, options: defaultOptions });
}
describe("anonymous persisted sessions", () => {
  it("lets a trusted admin start any world without manufacturing earned stars", async () => {
    const t = app.createTest();
    for (const worldId of ["jungle", "desert", "arctic", "city", "ocean"]) {
      const result = await t.mutation(app.api.players.command, {
        secret,
        keyHash: "admin-player",
        sessionId: `demo-${worldId}`,
        hasAdminAccess: true,
        command: startCommand(worldId),
      });
      expect(result.state.session?.worldId).toBe(worldId);
      expect(result.state.stars).toBe(0);
      expect(result.state.points).toBe(0);
    }
  });

  beforeEach(() => {
    vi.stubEnv("GAME_SERVER_SECRET", secret);
  });
  it("rejects direct backend access without the server credential", async () => {
    const t = app.createTest();
    await expect(
      t.query(app.api.players.load, { secret: "wrong", keyHash: "alice" }),
    ).rejects.toThrow("Unauthorized");
    await expect(
      t.mutation(app.api.players.command, {
        secret: "wrong",
        keyHash: "alice",
        command: startCommand(),
        sessionId: "one",
      }),
    ).rejects.toThrow("Unauthorized");
  });
  it("keeps anonymous players isolated and restores an unfinished board", async () => {
    const t = app.createTest();
    const started = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "alice",
      command: startCommand(),
      sessionId: "one",
    });
    const session = started.state.session!;
    const moved = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "alice",
      sessionId: "unused",
      command: JSON.stringify({
        kind: "move",
        sessionId: session.id,
        expectedRevision: 0,
        word: session.order[0],
      }),
    });
    expect(
      (await t.query(app.api.players.load, { secret, keyHash: "alice" }))
        .session,
    ).toEqual(moved.state.session);
    expect(
      (await t.query(app.api.players.load, { secret, keyHash: "bob" })).session,
    ).toBeNull();
  });
  it("rejects locked worlds on the backend, even with a crafted client command", async () => {
    const t = app.createTest();
    await expect(
      t.mutation(app.api.players.command, {
        secret,
        keyHash: "alice",
        command: startCommand("desert"),
        sessionId: "one",
      }),
    ).rejects.toThrow("World locked");
  });
  it("ignores stale commands and commits exactly one star when the winning move is retried", async () => {
    const t = app.createTest();
    let result = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "alice",
      command: startCommand(),
      sessionId: "one",
    });
    let lastCommand = "";
    while (result.state.session!.phase === "playing") {
      const session = result.state.session!;
      lastCommand = JSON.stringify({
        kind: "move",
        sessionId: session.id,
        expectedRevision: session.revision,
        word: session.order[session.cursor],
      });
      result = await t.mutation(app.api.players.command, {
        secret,
        keyHash: "alice",
        command: lastCommand,
        sessionId: "unused",
      });
      if (result.state.session!.revision === 1) {
        const duplicate = await t.mutation(app.api.players.command, {
          secret,
          keyHash: "alice",
          command: lastCommand,
          sessionId: "unused",
        });
        expect(duplicate.outcome).toBe("ignored");
        expect(duplicate.state.session!.revision).toBe(1);
      }
    }
    expect(result.state.stars).toBe(1);
    expect(result.state.results).toHaveLength(1);
    const duplicate = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "alice",
      command: lastCommand,
      sessionId: "unused",
    });
    expect(duplicate.state.stars).toBe(1);
    expect(duplicate.state.points).toBe(result.state.points);
  });
});

describe("persisted picture matching", () => {
  it("resumes matched cards, preserves bingo, and awards a completed game only once", async () => {
    const t = app.createTest();
    vi.stubEnv("GAME_SERVER_SECRET", secret);
    const bingo = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "pair-player",
      sessionId: "bingo-game",
      command: JSON.stringify({
        kind: "start",
        worldId: "jungle",
        options: defaultOptions,
      }),
    });
    let result = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "pair-player",
      sessionId: "pair-game",
      command: JSON.stringify({ kind: "matching-start", worldId: "jungle" }),
    });
    let lastCommand = "";
    for (const face of new Set(result.state.matchingSession!.board)) {
      const session = result.state.matchingSession!;
      const pair = session.board.flatMap((item, index) =>
        item === face ? [index] : [],
      );
      for (const index of pair) {
        const current = result.state.matchingSession!;
        lastCommand = JSON.stringify({
          kind: "matching-flip",
          sessionId: current.id,
          expectedRevision: current.revision,
          index,
        });
        result = await t.mutation(app.api.players.command, {
          secret,
          keyHash: "pair-player",
          sessionId: "unused",
          command: lastCommand,
        });
      }
    }
    expect(result.state.matchingSession?.phase).toBe("won");
    expect(result.state.session).toEqual(bingo.state.session);
    expect(result.state.stars).toBe(1);
    expect(result.state.points).toBe(100);
    expect(
      (await t.query(app.api.players.load, { secret, keyHash: "pair-player" }))
        .matchingSession,
    ).toEqual(result.state.matchingSession);
    const retried = await t.mutation(app.api.players.command, {
      secret,
      keyHash: "pair-player",
      sessionId: "unused",
      command: lastCommand,
    });
    expect(retried.outcome).toBe("ignored");
    expect(retried.state.stars).toBe(1);
  });
});

describe("server-authoritative learning activities", () => {
  it.each([
    ["number-trail", "addition", 100],
    ["fraction-cafe", "default", 100],
    ["math-drops", "division", 80],
    ["word-builder", "default", 100],
  ] as const)(
    "validates %s answers and awards once",
    async (gameId, mode, points) => {
      vi.stubEnv("GAME_SERVER_SECRET", secret);
      const t = app.createTest();
      let result = await t.mutation(app.api.players.command, {
        secret,
        keyHash: "player",
        sessionId: "round-one",
        command: JSON.stringify({
          kind: "activity-start",
          gameId,
          mode,
          worldId: "jungle",
        }),
      });
      let session = result.state.activitySessions.find(
        (item) => item.gameId === gameId,
      )!;
      const incorrect = await t.mutation(app.api.players.command, {
        secret,
        keyHash: "player",
        sessionId: "unused",
        command: JSON.stringify({
          kind: "activity-answer",
          gameId,
          sessionId: session.id,
          expectedRevision: 0,
          answer: "incorrect",
        }),
      });
      expect(incorrect.outcome).toBe("incorrect");
      expect(incorrect.state.stars).toBe(0);
      let lastCommand = "";
      while (session.phase === "playing") {
        const question = session.questions[session.cursor];
        const answer =
          gameId === "fraction-cafe"
            ? Array.from(
                { length: question.answer as number },
                (_, index) => index,
              )
            : question.answer;
        lastCommand = JSON.stringify({
          kind: "activity-answer",
          gameId,
          sessionId: session.id,
          expectedRevision: session.revision,
          answer,
        });
        result = await t.mutation(app.api.players.command, {
          secret,
          keyHash: "player",
          sessionId: "unused",
          command: lastCommand,
        });
        session = result.state.activitySessions.find(
          (item) => item.gameId === gameId,
        )!;
      }
      expect(result.outcome).toBe("won");
      expect(session.answers).toHaveLength(session.questions.length);
      expect(result.state.stars).toBe(1);
      expect(result.state.points).toBe(points);
      const retried = await t.mutation(app.api.players.command, {
        secret,
        keyHash: "player",
        sessionId: "unused",
        command: lastCommand,
      });
      expect(retried.outcome).toBe("ignored");
      expect(retried.state.stars).toBe(1);
      expect(
        (await t.query(app.api.players.load, { secret, keyHash: "player" }))
          .activitySessions,
      ).toEqual(result.state.activitySessions);
    },
  );
  it("saves puzzle pieces in any order and awards one star only on completion", async () => {
    const t = app.createTest();
    const base = {
      secret,
      keyHash: "puzzle-player",
      sessionId: "puzzle-round",
    };
    let result = await t.mutation(app.api.players.command, {
      ...base,
      command: JSON.stringify({
        kind: "activity-start",
        gameId: "jigsaw",
        mode: "3x3",
        worldId: "jungle",
      }),
    });
    let revision = 0;
    let lastCommand = "";
    for (const piece of [8, 0, 4, 7, 2, 3, 1, 6, 5]) {
      lastCommand = JSON.stringify({
        kind: "activity-answer",
        gameId: "jigsaw",
        sessionId: "puzzle-round",
        expectedRevision: revision,
        answer: piece,
      });
      result = await t.mutation(app.api.players.command, {
        ...base,
        command: lastCommand,
      });
      revision++;
    }
    expect(result.outcome).toBe("won");
    expect(result.state.stars).toBe(1);
    expect(result.state.points).toBe(100);
    const retry = await t.mutation(app.api.players.command, {
      ...base,
      command: lastCommand,
    });
    expect(retry.outcome).toBe("ignored");
    expect(retry.state.stars).toBe(1);
  });
  it("replaces an expired math drop without credit and ignores duplicate skips", async () => {
    const t = app.createTest();
    const base = { secret, keyHash: "skip-player", sessionId: "drop-round" };
    const started = await t.mutation(app.api.players.command, {
      ...base,
      command: JSON.stringify({
        kind: "activity-start",
        gameId: "math-drops",
        mode: "addition",
        worldId: "jungle",
      }),
    });
    const before = started.state.activitySessions[0];
    const command = JSON.stringify({
      kind: "activity-skip",
      gameId: "math-drops",
      sessionId: before.id,
      expectedRevision: before.revision,
    });
    const skipped = await t.mutation(app.api.players.command, {
      ...base,
      command,
    });
    const after = skipped.state.activitySessions[0];
    expect(skipped.outcome).toBe("skipped");
    expect(after.questions[0].prompt).not.toBe(before.questions[0].prompt);
    expect(after.cursor).toBe(0);
    expect(skipped.state.stars).toBe(0);
    const retried = await t.mutation(app.api.players.command, {
      ...base,
      command,
    });
    expect(retried.outcome).toBe("ignored");
    expect(retried.state.activitySessions[0]).toEqual(after);
  });
  it("rejects impossible modes, locked worlds, and forged answers", async () => {
    vi.stubEnv("GAME_SERVER_SECRET", secret);
    const t = app.createTest();
    const base = { secret, keyHash: "player", sessionId: "round" };
    await expect(
      t.mutation(app.api.players.command, {
        ...base,
        command: JSON.stringify({
          kind: "activity-start",
          gameId: "fraction-cafe",
          mode: "division",
          worldId: "jungle",
        }),
      }),
    ).rejects.toThrow("Invalid activity mode");
    await expect(
      t.mutation(app.api.players.command, {
        ...base,
        command: JSON.stringify({
          kind: "activity-start",
          gameId: "number-trail",
          mode: "addition",
          worldId: "desert",
        }),
      }),
    ).rejects.toThrow("World locked");
    const started = await t.mutation(app.api.players.command, {
      ...base,
      command: JSON.stringify({
        kind: "activity-start",
        gameId: "fraction-cafe",
        mode: "default",
        worldId: "jungle",
      }),
    });
    const question = started.state.activitySessions[0].questions[0];
    const forged = await t.mutation(app.api.players.command, {
      ...base,
      command: JSON.stringify({
        kind: "activity-answer",
        gameId: "fraction-cafe",
        sessionId: "round",
        expectedRevision: 0,
        answer: question.answer,
      }),
    });
    expect(forged.outcome).toBe("incorrect");
    expect(forged.state.stars).toBe(0);
  });
});
