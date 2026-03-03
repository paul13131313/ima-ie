import { NextRequest, NextResponse } from "next/server";
import { handleLightEvent } from "@/lib/state";
import { getRedis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const bodyText = await request.text();

  // デバッグ: 受信ペイロードをRedisに保存
  const redis = getRedis();
  if (redis) {
    await redis.lpush("ima-ie:webhook-debug", JSON.stringify({
      timestamp: Date.now(),
      body: bodyText,
      headers: {
        sign: request.headers.get("sign"),
        "content-type": request.headers.get("content-type"),
      },
    }));
    await redis.ltrim("ima-ie:webhook-debug", 0, 19);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // デバイスフィルタ: deviceMacまたはdeviceTypeで判定
  const deviceId = process.env.SWITCHBOT_DEVICE_ID;
  const deviceMac = payload.context?.deviceMac;
  const deviceType = payload.context?.deviceType || "";
  const isCeilingLight = deviceType.toLowerCase().includes("ceiling light");
  const isTargetDevice = deviceMac === deviceId || isCeilingLight;

  if (!isTargetDevice) {
    return NextResponse.json({ message: "Ignored: not target device", deviceMac, deviceType });
  }

  const power = payload.context?.powerState;
  let powerState: "ON" | "OFF" | null = null;
  if (power === "ON" || power === "on") powerState = "ON";
  if (power === "OFF" || power === "off") powerState = "OFF";

  if (!powerState) {
    return NextResponse.json({ message: "Ignored: no power state", context: payload.context });
  }

  const result = await handleLightEvent(powerState);

  return NextResponse.json({ received: powerState, ...result });
}
