import { AppState, EventLog, EventType, Status } from "./types";
import { getRedis } from "./redis";

const SLEEP_TIMEOUT_MS = 5 * 60 * 1000; // 5分
const AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5分

const STATE_KEY = "ima-ie:state";
const EVENTS_KEY = "ima-ie:events";

const DEFAULT_STATE: AppState = {
  status: "AWAY",
  pendingTimeout: null,
  pendingAt: null,
  updatedAt: Date.now(),
  lastEvent: null,
};

// --- インメモリフォールバック（Redis未設定時） ---
let memState: AppState = { ...DEFAULT_STATE };
let memEvents: EventLog[] = [];

// --- Redis操作 ---
async function loadState(): Promise<AppState> {
  const redis = getRedis();
  if (!redis) return { ...memState };

  const data = await redis.get<AppState>(STATE_KEY);
  return data || { ...DEFAULT_STATE };
}

async function saveState(state: AppState): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memState = state;
    return;
  }
  await redis.set(STATE_KEY, state);
}

async function loadEvents(): Promise<EventLog[]> {
  const redis = getRedis();
  if (!redis) return [...memEvents];

  const data = await redis.get<EventLog[]>(EVENTS_KEY);
  return data || [];
}

async function saveEvents(events: EventLog[]): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memEvents = events;
    return;
  }
  await redis.set(EVENTS_KEY, events);
}

// --- Public API (全てasync) ---

export async function getState(): Promise<AppState> {
  return loadState();
}

export async function getEvents(): Promise<EventLog[]> {
  return loadEvents();
}

function isNightTime(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 22 || hour < 6;
}

export async function handleLightEvent(
  powerState: "ON" | "OFF",
  nowOverride?: Date
): Promise<{ status: Status; message: string }> {
  const state = await loadState();
  const events = await loadEvents();
  const now = nowOverride || new Date();
  const timestamp = now.getTime();

  if (powerState === "ON") {
    const previousStatus = state.status;
    state.status = "HOME_AWAKE";
    state.pendingTimeout = null;
    state.pendingAt = null;
    state.updatedAt = timestamp;
    state.lastEvent = { type: "LIGHT_ON", timestamp };

    let message = "在宅・起床";
    if (previousStatus === "AWAY") {
      message = "帰宅しました 🏠";
    } else if (previousStatus === "HOME_ASLEEP") {
      message = "起床しました ☀️";
    }

    events.unshift({ type: "LIGHT_ON", timestamp, result: "HOME_AWAKE" });
    if (events.length > 100) events.splice(100);

    await saveState(state);
    await saveEvents(events);
    return { status: "HOME_AWAKE", message };
  }

  // powerState === "OFF"
  state.lastEvent = { type: "LIGHT_OFF", timestamp };

  if (isNightTime(now)) {
    state.pendingTimeout = "SLEEP";
    state.pendingAt = timestamp;
    events.unshift({ type: "LIGHT_OFF", timestamp, result: "pending:SLEEP" });
  } else {
    state.pendingTimeout = "AWAY";
    state.pendingAt = timestamp;
    events.unshift({ type: "LIGHT_OFF", timestamp, result: "pending:AWAY" });
  }

  if (events.length > 100) events.splice(100);
  await saveState(state);
  await saveEvents(events);

  const msg = state.pendingTimeout === "SLEEP"
    ? "5分後に就寝判定予定 🌙"
    : "5分後に外出判定予定 🚶";
  return { status: state.status, message: msg };
}

export async function checkTimeouts(forceType?: "SLEEP" | "AWAY"): Promise<{
  changed: boolean;
  status: Status;
  message: string;
}> {
  const state = await loadState();

  if (!state.pendingTimeout || !state.pendingAt) {
    return { changed: false, status: state.status, message: "保留中のタイムアウトなし" };
  }

  const now = Date.now();
  const elapsed = now - state.pendingAt;

  let shouldTransition = false;
  let targetStatus: Status | null = null;
  let message = "";

  if (forceType) {
    if (forceType === "SLEEP" && state.pendingTimeout === "SLEEP") {
      shouldTransition = true;
      targetStatus = "HOME_ASLEEP";
      message = "就寝しました 🌙";
    } else if (forceType === "AWAY" && state.pendingTimeout === "AWAY") {
      shouldTransition = true;
      targetStatus = "AWAY";
      message = "外出しました 🚶";
    } else {
      return { changed: false, status: state.status, message: "該当するタイムアウトなし" };
    }
  } else {
    if (state.pendingTimeout === "SLEEP" && elapsed >= SLEEP_TIMEOUT_MS) {
      shouldTransition = true;
      targetStatus = "HOME_ASLEEP";
      message = "就寝しました 🌙";
    } else if (state.pendingTimeout === "AWAY" && elapsed >= AWAY_TIMEOUT_MS) {
      shouldTransition = true;
      targetStatus = "AWAY";
      message = "外出しました 🚶";
    }
  }

  if (shouldTransition && targetStatus) {
    state.status = targetStatus;
    state.pendingTimeout = null;
    state.pendingAt = null;
    state.updatedAt = now;
    await saveState(state);
    return { changed: true, status: targetStatus, message };
  }

  return { changed: false, status: state.status, message: "タイムアウト未到達" };
}

export async function resetState(): Promise<void> {
  await saveState({ ...DEFAULT_STATE, updatedAt: Date.now() });
  await saveEvents([]);
}
