export const RECENTLY_VIEWED_KEY = "nestwell.recently-viewed.v1";
export const RECENTLY_VIEWED_EVENT = "nestwell:recently-viewed";
export function recentIds(value: string | null) {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter(
              (v): v is string =>
                typeof v === "string" && v.length > 0 && v.length <= 100,
            ),
          ),
        ].slice(0, 8)
      : [];
  } catch {
    return [];
  }
}
export function addRecentId(ids: string[], id: string) {
  return [id, ...ids.filter((value) => value !== id)].slice(0, 8);
}
