import { NextRequest, NextResponse } from "next/server";
import { DrawNotFoundError, resetDraw } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// New links and new matches for everyone in a draw. The old links stop working.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { drawId } = await request.json();
    if (!drawId || typeof drawId !== "string") {
      return NextResponse.json({ error: "drawId is required" }, { status: 400 });
    }

    await resetDraw(drawId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof DrawNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error resetting draw:", error);
    return NextResponse.json({ error: "Failed to reset draw" }, { status: 500 });
  }
}
