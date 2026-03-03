import { NextResponse } from "next/server";
import { getState, getEvents, checkTimeouts } from "@/lib/state";

export async function GET() {
  try {
    // ポーリング時にタイムアウトもチェック
    await checkTimeouts();

    const state = await getState();
    const events = await getEvents();
    return NextResponse.json({ state, events: events.slice(0, 20) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
