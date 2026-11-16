import { NextRequest, NextResponse } from "next/server";
import { addLateJoiner, DrawNotFoundError, LateJoinerError } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// Adds one person to a draw by moving one volunteer's match. The response holds the
// newcomer's link only, never which volunteer was picked.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { drawId, name, volunteerIds } = await request.json();

    if (!drawId || typeof drawId !== "string") {
      return NextResponse.json({ error: "drawId is required" }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Namn saknas" }, { status: 400 });
    }
    if (!Array.isArray(volunteerIds) || !volunteerIds.every((v) => typeof v === "string")) {
      return NextResponse.json({ error: "Välj minst en frivillig" }, { status: 400 });
    }

    const newcomer = await addLateJoiner(drawId, name.trim(), volunteerIds);
    return NextResponse.json({ success: true, participantId: newcomer.id });
  } catch (error) {
    if (error instanceof DrawNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof LateJoinerError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error adding late joiner:", error);
    return NextResponse.json({ error: "Det gick inte att lägga till personen" }, { status: 500 });
  }
}
