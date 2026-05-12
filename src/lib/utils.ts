import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL?.replace(/^/, "https://") ??
    "http://localhost:3000";

  return new URL(path, base).toString();
}

export function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin.startsWith("http") ? origin : `https://${origin}`);
    return url.host.toLowerCase();
  } catch {
    return origin.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]) {
  if (!origin || allowedOrigins.length === 0) {
    return true;
  }

  const host = normalizeOrigin(origin);
  return allowedOrigins.some((allowed) => normalizeOrigin(allowed) === host);
}
