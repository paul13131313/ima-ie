export type Status = "HOME_AWAKE" | "HOME_ASLEEP" | "AWAY";
export type PendingTimeout = "SLEEP" | "AWAY" | null;
export type EventType = "LIGHT_ON" | "LIGHT_OFF";

export interface AppState {
  status: Status;
  pendingTimeout: PendingTimeout;
  pendingAt: number | null;
  updatedAt: number;
  lastEvent: {
    type: EventType;
    timestamp: number;
  } | null;
}

export interface EventLog {
  type: EventType;
  timestamp: number;
  result: string;
}

export const STATUS_CONFIG = {
  HOME_AWAKE: {
    label: "在宅・起床",
    icon: "🏠☀️",
    bgClass: "bg-amber-50 dark:bg-amber-950",
    cardClass: "bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700",
    textClass: "text-amber-900 dark:text-amber-100",
  },
  HOME_ASLEEP: {
    label: "在宅・就寝",
    icon: "🏠🌙",
    bgClass: "bg-indigo-950 dark:bg-slate-950",
    cardClass: "bg-indigo-900 dark:bg-indigo-950 border-indigo-700 dark:border-indigo-800",
    textClass: "text-indigo-100 dark:text-indigo-200",
  },
  AWAY: {
    label: "外出中",
    icon: "🚶",
    bgClass: "bg-gray-100 dark:bg-gray-900",
    cardClass: "bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700",
    textClass: "text-gray-700 dark:text-gray-300",
  },
} as const;
