import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { hasAdminAccess } from "@/lib/server/admin-session";
import { commandSchema } from "@/lib/platform/commands";

async function getIdentity(isAdminMode: boolean) {
  const jar = await cookies();
  let token = jar.get("lg_player")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    jar.set("lg_player", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return createHash("sha256")
    .update(isAdminMode ? `admin:${token}` : token)
    .digest("hex");
}
function getBackend() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.GAME_SERVER_SECRET;
  if (!url || !secret) return null;
  return { client: new ConvexHttpClient(url), secret };
}
export async function GET() {
  const isAdminMode = await hasAdminAccess();
  const backend = getBackend();
  if (!backend) return NextResponse.json({ storage: "device", isAdminMode });
  try {
    const keyHash = await getIdentity(isAdminMode);
    const state = await backend.client.query(api.players.load, {
      secret: backend.secret,
      keyHash,
    });
    return NextResponse.json(
      { storage: "cloud", state, isAdminMode },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Your adventure could not be loaded. Please try again." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const isAdminMode = await hasAdminAccess();
  const backend = getBackend();
  if (!backend)
    return NextResponse.json(
      { error: "Cloud storage is not configured." },
      { status: 503 },
    );
  const input = commandSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid game action." },
      { status: 400 },
    );
  try {
    const keyHash = await getIdentity(isAdminMode);
    const result = await backend.client.mutation(api.players.command, {
      keyHash,
      secret: backend.secret,
      command: JSON.stringify(input.data),
      sessionId: randomUUID(),
      hasAdminAccess: isAdminMode,
    });
    return NextResponse.json(
      { ...result, isAdminMode },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Your move could not be saved. Please try again." },
      { status: 503 },
    );
  }
}
