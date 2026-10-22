import { NextRequest, NextResponse } from "next/server";
import { ActiveDrawExistsError, createDraw } from "@/lib/kv";
import { isEventDate, isEventTime } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { participantNames, budgetMessage, eventDetails, eventDate, eventTime } = body;

    if (!isEventDate(eventDate)) {
      return NextResponse.json({ error: "Datum saknas" }, { status: 400 });
    }
    if (!isEventTime(eventTime)) {
      return NextResponse.json({ error: "Tid saknas" }, { status: 400 });
    }

    // Validate
    if (
      !participantNames ||
      !Array.isArray(participantNames) ||
      participantNames.length < 2
    ) {
      return NextResponse.json(
        { error: "Minst 2 personer behövs" },
        { status: 400 }
      );
    }

    if (!budgetMessage || typeof budgetMessage !== "string") {
      return NextResponse.json(
        { error: "Budget saknas" },
        { status: 400 }
      );
    }

    if (!eventDetails || typeof eventDetails !== "string") {
      return NextResponse.json(
        { error: "När och var saknas" },
        { status: 400 }
      );
    }

    const { draw, participants } = await createDraw(
      participantNames,
      budgetMessage,
      eventDetails,
      eventDate,
      eventTime
    );

    return NextResponse.json({
      success: true,
      drawId: draw.id,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    });
  } catch (error) {
    if (error instanceof ActiveDrawExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error creating draw:", error);
    return NextResponse.json(
      { error: "Det gick inte att skapa dragningen" },
      { status: 500 }
    );
  }
}
