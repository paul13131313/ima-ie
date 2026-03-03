import { NextResponse } from "next/server";
import { getState, getEvents } from "@/lib/state";

export async function GET() {
  const state = await getState();
  const events = await getEvents();
  return NextResponse.json({ state, events: events.slice(0, 20) });
}
