const globalState = globalThis as unknown as {
  authLimits?: Map<string, { count: number; until: number }>;
};
const entries = (globalState.authLimits ??= new Map());
export function takeAuthRequest(
  ip: string,
  mutation: boolean,
  now = Date.now(),
) {
  for (const [key, value] of entries)
    if (value.until <= now) entries.delete(key);
  const key = `${mutation ? "write" : "read"}:${ip}`;
  let entry = entries.get(key);
  if (!entry) {
    if (entries.size >= 10000) return { allowed: false, retryAfter: 60 };
    entry = { count: 0, until: now + 60000 };
    entries.set(key, entry);
  }
  entry.count++;
  return {
    allowed: entry.count <= (mutation ? 20 : 120),
    retryAfter: Math.max(1, Math.ceil((entry.until - now) / 1000)),
  };
}
