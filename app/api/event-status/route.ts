import { NextRequest, NextResponse } from "next/server";
import { getParticipants, listDraws } from "@/lib/kv";
import { requireAdmin } from "@/lib/auth";

// Admin overview: the active draw and the history.
// Never assignedTo (the draw itself). Participant ids are the secret links: the admin
// shares them from here and needs them to edit archived draws.
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const draws = await listDraws();

    const summaries = await Promise.all(
      draws.map(async (draw) => {
        const participants = await getParticipants(draw);
        return {
          id: draw.id,
          status: draw.status,
          budgetMessage: draw.budgetMessage,
          eventDetails: draw.eventDetails,
          eventDate: draw.eventDate ?? null,
          eventTime: draw.eventTime ?? null,
          createdAt: draw.createdAt,
          archivedAt: draw.archivedAt,
          participants: participants.map((p) => ({
            id: p.id,
            name: p.name,
            hasRevealed: p.hasRevealed,
          })),
        };
      })
    );

    return NextResponse.json({
      active: summaries.find((d) => d.status === "active") ?? null,
      archived: summaries.filter((d) => d.status === "archived"),
    });
  } catch (error) {
    console.error("Error fetching draw status:", error);
    return NextResponse.json(
      { error: "Det gick inte att hämta dragningarna" },
      { status: 500 }
    );
  }
}
