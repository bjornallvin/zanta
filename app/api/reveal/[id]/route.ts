import { NextRequest, NextResponse } from "next/server";
import { assignSecretSanta, getEvent, getParticipant } from "@/lib/kv";

// Read-only: says who the link belongs to, and the result only if already revealed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await getEvent();
    const participant = event?.participants.find((p) => p.id === id);
    if (!event || !participant) {
      return NextResponse.json(
        { error: "This link doesn't match a Secret Santa draw. Check that you copied the whole link." },
        { status: 404 }
      );
    }

    if (!participant.hasRevealed) {
      return NextResponse.json({
        participantName: participant.name,
        hasRevealed: false,
      });
    }

    const assignedName = await assignSecretSanta(id);
    return NextResponse.json({
      participantName: participant.name,
      hasRevealed: true,
      assignedName,
      budgetMessage: event.budgetMessage,
      eventDetails: event.eventDetails,
    });
  } catch (error: any) {
    console.error("Error loading participant:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load your link" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Check if participant exists
    const participant = await getParticipant(id);
    if (!participant) {
      return NextResponse.json(
        { error: "Invalid link. Please check your Secret Santa link." },
        { status: 404 }
      );
    }

    // Get event for budget message
    const event = await getEvent();
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Assign Secret Santa (or get existing assignment)
    const assignedName = await assignSecretSanta(id);

    return NextResponse.json({
      success: true,
      assignedName,
      budgetMessage: event.budgetMessage,
      eventDetails: event.eventDetails,
      participantName: participant.name,
    });
  } catch (error: any) {
    console.error("Error revealing assignment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reveal assignment" },
      { status: 500 }
    );
  }
}
