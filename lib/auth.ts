import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Admin routes require the x-admin-password header to match ADMIN_PASSWORD.
// With no ADMIN_PASSWORD set, every admin request is refused.
export function requireAdmin(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD;
  const given = request.headers.get("x-admin-password") ?? "";

  if (expected) {
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return null;
  }

  return NextResponse.json({ error: "Wrong admin password" }, { status: 401 });
}
