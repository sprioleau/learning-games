import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "lg_admin_mode";
const durationSeconds = 60 * 60 * 8;
function getSigningSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.GAME_SERVER_SECRET;
}
export function createAdminToken(secret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: now + durationSeconds * 1000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function isValidAdminToken(
  token: string,
  secret: string,
  now = Date.now(),
) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isSafeInteger(data.expiresAt) && data.expiresAt > now;
  } catch {
    return false;
  }
}
export async function hasAdminAccess() {
  const secret = getSigningSecret();
  const token = (await cookies()).get(cookieName)?.value;
  return Boolean(secret && token && isValidAdminToken(token, secret));
}
export async function startAdminSession() {
  const secret = getSigningSecret();
  if (!secret) throw new Error("Admin session signing is not configured.");
  (await cookies()).set(cookieName, createAdminToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: durationSeconds,
  });
}
export async function endAdminSession() {
  (await cookies()).delete(cookieName);
}
export function isCorrectAdminPassword(password: string) {
  const expected = createHmac("sha256", "admin-password-check")
    .update(process.env.ADMIN_MODE_PASSWORD || "admin")
    .digest();
  const actual = createHmac("sha256", "admin-password-check")
    .update(password)
    .digest();
  return timingSafeEqual(expected, actual);
}
