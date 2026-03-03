import { NextRequest, NextResponse } from "next/server";
import { checkTimeouts } from "@/lib/state";

export async function GET(request: NextRequest) {
  // Vercel Cronからの呼び出しを検証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkTimeouts();

  return NextResponse.json(result);
}
