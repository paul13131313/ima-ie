import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
  }

  const logs = await redis.lrange("ima-ie:webhook-debug", 0, 19);
  return NextResponse.json({ logs });
}
