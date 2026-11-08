const globalState = globalThis as unknown as {
  enquiryLimits?: Map<string, number>;
};
const entries = (globalState.enquiryLimits ??= new Map());
export function takeEnquiryRequest(ip: string, now = Date.now()) {
  for (const [key, until] of entries) if (until <= now) entries.delete(key);
  const until = entries.get(ip);
  if (until)
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((until - now) / 1000)),
    };
  if (entries.size >= 10000) return { allowed: false, retryAfter: 10 };
  entries.set(ip, now + 10000);
  return { allowed: true, retryAfter: 0 };
}
