import { NextResponse } from "next/server";
import { resetState } from "@/lib/state";

export async function POST() {
  await resetState();
  return NextResponse.json({ message: "状態をリセットしました" });
}
