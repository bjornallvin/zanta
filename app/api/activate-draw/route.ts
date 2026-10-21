import { NextRequest, NextResponse } from "next/server";
import { DrawNotFoundError, activateDraw } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// Makes an archived draw the active one. The draw that was active gets archived.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { drawId } = await request.json();
    if (!drawId || typeof drawId !== "string") {
      return NextResponse.json({ error: "drawId is required" }, { status: 400 });
    }

    const { archived } = await activateDraw(drawId);
    return NextResponse.json({ success: true, archivedDrawId: archived?.id ?? null });
  } catch (error) {
    if (error instanceof DrawNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error activating draw:", error);
    return NextResponse.json({ error: "Det gick inte att göra dragningen aktiv" }, { status: 500 });
  }
}
