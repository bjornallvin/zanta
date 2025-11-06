import { NextResponse } from "next/server";
import { getEvent } from "@/lib/kv";

export async function GET() {
  try {
    const event = await getEvent();

    if (!event) {
      return NextResponse.json({ event: null });
    }

    return NextResponse.json({
      event: {
        participants: event.participants,
        budgetMessage: event.budgetMessage,
        eventDetails: event.eventDetails,
        createdAt: event.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching event status:", error);
    return NextResponse.json(
      { error: "Failed to fetch event status" },
      { status: 500 }
    );
  }
}
