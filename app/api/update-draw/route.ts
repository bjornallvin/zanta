import { NextRequest, NextResponse } from "next/server";
import { DrawNotFoundError, updateDraw } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// Edits a draw, active or archived: budget, details and people.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { drawId, budgetMessage, eventDetails, people } = await request.json();

    if (!drawId || typeof drawId !== "string") {
      return NextResponse.json({ error: "drawId is required" }, { status: 400 });
    }
    if (!budgetMessage || typeof budgetMessage !== "string") {
      return NextResponse.json({ error: "Budget saknas" }, { status: 400 });
    }
    if (!eventDetails || typeof eventDetails !== "string") {
      return NextResponse.json({ error: "När och var saknas" }, { status: 400 });
    }

    const valid =
      Array.isArray(people) &&
      people.every(
        (p) =>
          p &&
          typeof p.name === "string" &&
          p.name.trim() !== "" &&
          (p.id === undefined || typeof p.id === "string")
      );
    if (!valid || people.length < 2) {
      return NextResponse.json({ error: "Minst 2 personer behövs" }, { status: 400 });
    }

    const cleaned = people.map((p: { id?: string; name: string }) => ({ id: p.id, name: p.name.trim() }));
    if (new Set(cleaned.map((p: { name: string }) => p.name.toLowerCase())).size !== cleaned.length) {
      return NextResponse.json({ error: "Två personer har samma namn" }, { status: 400 });
    }

    const { redrawn } = await updateDraw(drawId, {
      budgetMessage: budgetMessage.trim(),
      eventDetails: eventDetails.trim(),
      people: cleaned,
    });

    return NextResponse.json({ success: true, redrawn });
  } catch (error) {
    if (error instanceof DrawNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error updating draw:", error);
    return NextResponse.json({ error: "Det gick inte att spara dragningen" }, { status: 500 });
  }
}
