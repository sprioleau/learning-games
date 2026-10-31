import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const env = readFileSync(".env.local", "utf8");
const existingSecret = env.match(/^GAME_SERVER_SECRET=(.+)$/m)?.[1]?.trim();
const secret = existingSecret || randomBytes(32).toString("hex");
if (!existingSecret) {
  const line = `GAME_SERVER_SECRET=${secret}`;
  const nextEnv = /^GAME_SERVER_SECRET=.*$/m.test(env)
    ? env.replace(/^GAME_SERVER_SECRET=.*$/m, line)
    : `${env}\n${line}\n`;
  writeFileSync(".env.local", nextEnv, { mode: 0o600 });
}
const result = spawnSync(
  "npx",
  ["convex", "env", "set", "GAME_SERVER_SECRET"],
  { input: secret, encoding: "utf8" },
);
if (result.status !== 0) {
  process.stderr.write("Failed to configure Convex secret.\n");
  process.exit(1);
}
process.stdout.write(
  "Development server secret configured without exposing its value.\n",
);
