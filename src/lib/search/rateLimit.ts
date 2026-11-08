import { isIP } from "node:net";
const globalState = globalThis as unknown as {
  searchRateLimits?: Map<string, { count: number; resetAt: number }>;
};
const windows = (globalState.searchRateLimits ??= new Map());
export function clientIP(headers: Headers) {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "";
  return isIP(ip) ? ip : "unknown";
}
export function takeSearchRequest(ip: string, now = Date.now()) {
  for (const [key, entry] of windows)
    if (entry.resetAt <= now) windows.delete(key);
  let entry = windows.get(ip);
  if (!entry) {
    if (windows.size >= 10000) return { allowed: false, retryAfter: 60 };
    entry = { count: 0, resetAt: now + 60000 };
    windows.set(ip, entry);
  }
  entry.count++;
  return {
    allowed: entry.count <= 20,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}
