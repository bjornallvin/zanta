import { NextRequest, NextResponse } from "next/server";
import { archiveActiveDraw } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// Archives the active draw. It is kept in the history; its links stop working.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const archived = await archiveActiveDraw();
    if (!archived) {
      return NextResponse.json({ error: "There is no active draw" }, { status: 404 });
    }

    return NextResponse.json({ success: true, drawId: archived.id });
  } catch (error) {
    console.error("Error archiving draw:", error);
    return NextResponse.json(
      { error: "Failed to archive draw" },
      { status: 500 }
    );
  }
}
