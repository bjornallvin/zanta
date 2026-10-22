import { NextRequest, NextResponse } from "next/server";
import { DrawArchivedError, getDraw, getParticipant, revealAssignment } from "@/lib/kv";

const NOT_FOUND = "Länken hör inte till någon Secret Santa-dragning. Kontrollera att du kopierade hela länken.";

function failure(error: unknown, fallback: string) {
  if (error instanceof DrawArchivedError) {
    return NextResponse.json({ error: error.message }, { status: 410 });
  }
  console.error(fallback, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 }
  );
}

// Read-only: says who the link belongs to, and the result only if already revealed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const participant = await getParticipant(id);
    const draw = participant && (await getDraw(participant.drawId));
    if (!participant || !draw) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }
    if (draw.status !== "active") {
      throw new DrawArchivedError();
    }

    // The date and time are not secret: the countdown shows them before the reveal
    const when = { eventDate: draw.eventDate ?? null, eventTime: draw.eventTime ?? null };

    if (!participant.hasRevealed) {
      return NextResponse.json({
        participantName: participant.name,
        hasRevealed: false,
        ...when,
      });
    }

    const { assignedName } = await revealAssignment(id);
    return NextResponse.json({
      participantName: participant.name,
      hasRevealed: true,
      assignedName,
      budgetMessage: draw.budgetMessage,
      eventDetails: draw.eventDetails,
      ...when,
    });
  } catch (error) {
    return failure(error, "Det gick inte att öppna din länk");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!(await getParticipant(id))) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    const { participant, draw, assignedName } = await revealAssignment(id);

    return NextResponse.json({
      success: true,
      assignedName,
      budgetMessage: draw.budgetMessage,
      eventDetails: draw.eventDetails,
      eventDate: draw.eventDate ?? null,
      eventTime: draw.eventTime ?? null,
      participantName: participant.name,
    });
  } catch (error) {
    return failure(error, "Det gick inte att visa vem du ska köpa till");
  }
}
