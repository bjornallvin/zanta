import { NextRequest, NextResponse } from "next/server";
import { assignSecretSanta, getEvent, getParticipant } from "@/lib/kv";

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
