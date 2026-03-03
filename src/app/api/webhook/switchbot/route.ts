import { NextRequest, NextResponse } from "next/server";
import { verifySwitchBotWebhook, extractLightPowerState, SwitchBotWebhookPayload } from "@/lib/switchbot";
import { handleLightEvent } from "@/lib/state";

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const signature = request.headers.get("sign");

  // 署名検証（SWITCHBOT_SECRETが設定されている場合のみ）
  if (process.env.SWITCHBOT_SECRET) {
    if (!verifySwitchBotWebhook(bodyText, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: SwitchBotWebhookPayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const powerState = extractLightPowerState(payload);

  if (!powerState) {
    return NextResponse.json({ message: "Ignored: not a target device or no power state" });
  }

  const result = await handleLightEvent(powerState);

  return NextResponse.json({
    received: powerState,
    ...result,
  });
}
