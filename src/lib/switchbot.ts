import crypto from "crypto";

export function verifySwitchBotWebhook(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.SWITCHBOT_SECRET;
  if (!secret) return false;
  if (!signature) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

export function extractLightPowerState(
  payload: SwitchBotWebhookPayload
): "ON" | "OFF" | null {
  const deviceId = process.env.SWITCHBOT_DEVICE_ID;

  if (!deviceId) return null;
  const deviceType = payload.context?.deviceType || "";
  const isCeilingLight = deviceType.startsWith("Ceiling Light");
  if (payload.context?.deviceMac !== deviceId && !isCeilingLight) {
    return null;
  }

  const power = payload.context?.powerState;
  if (power === "ON" || power === "on") return "ON";
  if (power === "OFF" || power === "off") return "OFF";

  return null;
}

export interface SwitchBotWebhookPayload {
  eventType?: string;
  eventVersion?: string;
  context?: {
    deviceMac?: string;
    deviceType?: string;
    powerState?: string;
    [key: string]: unknown;
  };
}
