import { NextRequest, NextResponse } from "next/server";
import { deleteDraw } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// Deletes a draw (active or archived) and all its participants for good.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { drawId } = await request.json();
    if (!drawId || typeof drawId !== "string") {
      return NextResponse.json({ error: "drawId is required" }, { status: 400 });
    }

    if (!(await deleteDraw(drawId))) {
      return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting draw:", error);
    return NextResponse.json(
      { error: "Failed to delete draw" },
      { status: 500 }
    );
  }
}
