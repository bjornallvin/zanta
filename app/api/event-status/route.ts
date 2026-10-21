import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const event = await getEvent();

    if (!event) {
      return NextResponse.json({ event: null });
    }

    return NextResponse.json({
      event: {
        // Only name and status: ids are the secret links, assignedTo is the draw
        participants: event.participants.map((p) => ({
          name: p.name,
          hasRevealed: p.hasRevealed,
        })),
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
