"use client";

import { useState, useEffect, useCallback } from "react";
import { AppState, EventLog, STATUS_CONFIG } from "@/lib/types";

interface ApiStatusResponse {
  state: AppState;
  events: EventLog[];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/status");
    const data: ApiStatusResponse = await res.json();
    setState(data.state);
    setEvents(data.events);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const sendEvent = async (type: "LIGHT_ON" | "LIGHT_OFF") => {
    setLoading(true);
    const res = await fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    showMessage(data.message);
    await fetchStatus();
    setLoading(false);
  };

  const forceTimeout = async (forceType: "SLEEP" | "AWAY") => {
    setLoading(true);
    const res = await fetch("/api/test/timeout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceType }),
    });
    const data = await res.json();
    showMessage(data.message);
    await fetchStatus();
    setLoading(false);
  };

  const resetAll = async () => {
    setLoading(true);
    const res = await fetch("/api/test/reset", { method: "POST" });
    const data = await res.json();
    showMessage(data.message);
    await fetchStatus();
    setLoading(false);
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const config = STATUS_CONFIG[state.status];

  return (
    <div
      className={`min-h-screen transition-colors duration-700 ${config.bgClass}`}
    >
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <h1 className={`text-center text-lg font-bold mb-8 ${config.textClass}`}>
          いま家？
        </h1>

        {/* Status Card */}
        <div
          className={`rounded-2xl border-2 p-8 text-center transition-all duration-700 ${config.cardClass}`}
        >
          <div className="text-6xl mb-4">{config.icon}</div>
          <div className={`text-2xl font-bold mb-2 ${config.textClass}`}>
            {config.label}
          </div>
          <div className={`text-sm opacity-70 ${config.textClass}`}>
            {timeAgo(state.updatedAt)}に更新
          </div>
          {state.pendingTimeout && state.pendingAt && (
            <div className={`text-xs mt-2 opacity-60 ${config.textClass}`}>
              ⏳ {state.pendingTimeout === "SLEEP" ? "就寝判定" : "外出判定"}
              待ち（{formatTime(state.pendingAt)}〜）
            </div>
          )}
        </div>

        {/* Toast Message */}
        {message && (
          <div className="mt-4 p-3 rounded-lg bg-black/80 text-white text-center text-sm animate-pulse">
            {message}
          </div>
        )}

        {/* Test Buttons */}
        <div className="mt-8">
          <p className={`text-xs mb-3 opacity-50 ${config.textClass}`}>
            テスト用コントロール
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => sendEvent("LIGHT_ON")}
              disabled={loading}
              className="p-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-yellow-900 font-bold text-sm transition-all disabled:opacity-50"
            >
              💡 照明ON
            </button>
            <button
              onClick={() => sendEvent("LIGHT_OFF")}
              disabled={loading}
              className="p-3 rounded-xl bg-gray-700 hover:bg-gray-800 active:scale-95 text-gray-100 font-bold text-sm transition-all disabled:opacity-50"
            >
              🌑 照明OFF
            </button>
            <button
              onClick={() => forceTimeout("SLEEP")}
              disabled={loading}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-50"
            >
              ⏩ 5分経過（就寝）
            </button>
            <button
              onClick={() => forceTimeout("AWAY")}
              disabled={loading}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-50"
            >
              ⏩ 5分経過（外出）
            </button>
          </div>
          <button
            onClick={resetAll}
            disabled={loading}
            className="mt-3 w-full p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:scale-95 text-red-600 dark:text-red-400 font-bold text-sm transition-all disabled:opacity-50"
          >
            🔄 リセット
          </button>
        </div>

        {/* Event Log */}
        {events.length > 0 && (
          <div className="mt-8">
            <p className={`text-xs mb-3 opacity-50 ${config.textClass}`}>
              イベントログ（直近{events.length}件）
            </p>
            <div className="space-y-2">
              {events.map((event, i) => (
                <div
                  key={`${event.timestamp}-${i}`}
                  className={`flex items-center justify-between p-3 rounded-lg text-xs ${
                    state.status === "HOME_ASLEEP"
                      ? "bg-indigo-800/50 text-indigo-200"
                      : "bg-white/60 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="font-mono">
                    {event.type === "LIGHT_ON" ? "💡" : "🌑"}{" "}
                    {event.type.replace("LIGHT_", "")}
                  </span>
                  <span className="opacity-70">{event.result}</span>
                  <span className="opacity-50">{formatTime(event.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
