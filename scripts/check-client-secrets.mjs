import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const denied = [
  "OPENAI_API_KEY",
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
];
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(join(path, entry.name))
          : [join(path, entry.name)],
      ),
    )
  ).flat();
}
let failed = false;
for (const path of await walk(".next/static")) {
  const source = await readFile(path, "utf8");
  if (denied.some((name) => source.includes(name))) {
    console.error(`Server-only environment reference found: ${path}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    "Client bundles contain no server-secret environment references.",
  );
