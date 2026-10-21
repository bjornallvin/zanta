import { NextRequest, NextResponse } from "next/server";
import { ActiveDrawExistsError, createDraw } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

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

    const { draw, participants } = await createDraw(participantNames, budgetMessage, eventDetails);

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
      { error: "Failed to create draw" },
      { status: 500 }
    );
  }
}
