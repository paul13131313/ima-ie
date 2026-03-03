import { NextRequest, NextResponse } from "next/server";
import { handleLightEvent } from "@/lib/state";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type } = body;

  if (type !== "LIGHT_ON" && type !== "LIGHT_OFF") {
    return NextResponse.json(
      { error: "type must be LIGHT_ON or LIGHT_OFF" },
      { status: 400 }
    );
  }

  const powerState = type === "LIGHT_ON" ? "ON" : "OFF";
  const result = await handleLightEvent(powerState);

  return NextResponse.json(result);
}
