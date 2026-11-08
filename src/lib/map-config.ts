export function publicMapboxToken(value = process.env.MAPBOX_TOKEN) {
  return value?.startsWith("pk.") ? value : undefined;
}
