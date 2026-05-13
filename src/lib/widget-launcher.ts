export const LAUNCHER_POSITIONS = ["bottom-right", "bottom-left"] as const;
export const DEFAULT_LAUNCHER_BOTTOM_OFFSET = 20;
export const MAX_LAUNCHER_BOTTOM_OFFSET = 240;

export type LauncherPosition = (typeof LAUNCHER_POSITIONS)[number];

export function isLauncherPosition(value?: string | null): value is LauncherPosition {
  return LAUNCHER_POSITIONS.includes(value as LauncherPosition);
}

export function normalizeLauncherPosition(value?: string | null): LauncherPosition {
  return isLauncherPosition(value) ? value : "bottom-right";
}

export function normalizeLauncherBottomOffset(value?: number | string | null): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LAUNCHER_BOTTOM_OFFSET;
  }

  return Math.min(MAX_LAUNCHER_BOTTOM_OFFSET, Math.max(0, Math.round(parsed)));
}
