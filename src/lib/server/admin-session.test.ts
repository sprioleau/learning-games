import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminToken,
  isCorrectAdminPassword,
  isValidAdminToken,
} from "./admin-session";
afterEach(() => vi.unstubAllEnvs());
describe("signed demo access", () => {
  it("accepts an issued token only for its signing secret and before expiry", () => {
    const token = createAdminToken("server-only-secret", 1000);
    expect(isValidAdminToken(token, "server-only-secret", 2000)).toBe(true);
    expect(isValidAdminToken(token, "other-secret", 2000)).toBe(false);
    expect(
      isValidAdminToken(token, "server-only-secret", 1000 + 8 * 60 * 60 * 1000),
    ).toBe(false);
  });
  it("rejects edited claims, malformed tokens, and extra segments", () => {
    const token = createAdminToken("secret", 1000);
    const [, signature] = token.split(".");
    const edited = Buffer.from(
      JSON.stringify({ expiresAt: 999999999 }),
    ).toString("base64url");
    expect(isValidAdminToken(`${edited}.${signature}`, "secret", 2000)).toBe(
      false,
    );
    expect(isValidAdminToken(`${token}.extra`, "secret", 2000)).toBe(false);
    expect(isValidAdminToken("invalid", "secret", 2000)).toBe(false);
  });
  it("requires the configured password", () => {
    vi.stubEnv("ADMIN_MODE_PASSWORD", "admin");
    expect(isCorrectAdminPassword("admin")).toBe(true);
    expect(isCorrectAdminPassword("wrong")).toBe(false);
  });
});
