import { NextResponse } from "next/server";
import {
  endAdminSession,
  hasAdminAccess,
  isCorrectAdminPassword,
  startAdminSession,
} from "@/lib/server/admin-session";
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export async function GET() {
  return NextResponse.json(
    { isAdminMode: await hasAdminAccess() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const input = await request.json().catch(() => null);
  if (
    typeof input?.password !== "string" ||
    input.password.length > 200 ||
    !isCorrectAdminPassword(input.password)
  )
    return NextResponse.json(
      { error: "That password isn’t correct." },
      { status: 401 },
    );
  try {
    await startAdminSession();
    return NextResponse.json(
      { isAdminMode: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Admin mode is not configured on this server." },
      { status: 503 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  await endAdminSession();
  return NextResponse.json(
    { isAdminMode: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
