import { NextResponse } from "next/server";
import { getState, getEvents, checkTimeouts } from "@/lib/state";

export async function GET() {
  // ポーリング時にタイムアウトもチェック
  await checkTimeouts();

  const state = await getState();
  const events = await getEvents();
  return NextResponse.json({ state, events: events.slice(0, 20) });
}
