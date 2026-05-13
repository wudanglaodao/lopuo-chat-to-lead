export const LAUNCHER_POSITIONS = ["bottom-right", "bottom-left"] as const;

export type LauncherPosition = (typeof LAUNCHER_POSITIONS)[number];

export function isLauncherPosition(value?: string | null): value is LauncherPosition {
  return LAUNCHER_POSITIONS.includes(value as LauncherPosition);
}

export function normalizeLauncherPosition(value?: string | null): LauncherPosition {
  return isLauncherPosition(value) ? value : "bottom-right";
}
