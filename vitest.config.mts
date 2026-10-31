import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "convex/**/*.test.ts"],
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
  },
});
