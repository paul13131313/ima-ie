import { NextRequest, NextResponse } from "next/server";
import { checkTimeouts } from "@/lib/state";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { forceType } = body;

  if (forceType && forceType !== "SLEEP" && forceType !== "AWAY") {
    return NextResponse.json(
      { error: "forceType must be SLEEP or AWAY" },
      { status: 400 }
    );
  }

  const result = await checkTimeouts(forceType || undefined);
  return NextResponse.json(result);
}
