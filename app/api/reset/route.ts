import { NextRequest, NextResponse } from "next/server";
import { deleteEvent } from "@/lib/kv";

export async function POST(request: NextRequest) {
  try {
    await deleteEvent();

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
