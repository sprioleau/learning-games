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
