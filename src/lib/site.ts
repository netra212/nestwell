export function siteURL() {
  try {
    return new URL(
      process.env.SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000",
    );
  } catch {
    return new URL("http://localhost:3000");
  }
}
export const siteDescription =
  "Find UK homes in your own words. Explore property listings with natural-language and voice search, useful filters and a saved collection.";
