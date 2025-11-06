import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "@/lib/kv";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantNames, budgetMessage, eventDetails } = body;

    // Validate
    if (
      !participantNames ||
      !Array.isArray(participantNames) ||
      participantNames.length < 2
    ) {
      return NextResponse.json(
        { error: "At least 2 participants are required" },
        { status: 400 }
      );
    }

    if (participantNames.length % 2 !== 0) {
      return NextResponse.json(
        { error: "An even number of participants is required" },
        { status: 400 }
      );
    }

    if (!budgetMessage || typeof budgetMessage !== "string") {
      return NextResponse.json(
        { error: "Budget message is required" },
        { status: 400 }
      );
    }

    if (!eventDetails || typeof eventDetails !== "string") {
      return NextResponse.json(
        { error: "Event details are required" },
        { status: 400 }
      );
    }

    // Create the event
    const event = await createEvent(participantNames, budgetMessage, eventDetails);

    return NextResponse.json({
      success: true,
      participants: event.participants.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
