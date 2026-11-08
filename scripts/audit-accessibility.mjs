import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const output = resolve("work/accessibility");
await mkdir(output, { recursive: true });
let failed = false;
for (const [name, path] of [
  ["home", "/"],
  ["results", "/for-sale"],
]) {
  const file = resolve(output, `${name}.json`);
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "lighthouse",
      new URL(path, origin).href,
      "--only-categories=accessibility",
      "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
      "--output=json",
      `--output-path=${file}`,
      "--quiet",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    failed = true;
    continue;
  }
  const report = JSON.parse(await readFile(file, "utf8"));
  const score = report.categories.accessibility.score * 100;
  console.log(`${name}: Lighthouse Accessibility ${score}/100 (${file})`);
  if (report.runtimeError || score < 95) {
    failed = true;
    console.error(`${name}: audit failed its 95-point threshold`);
  }
}
if (failed) process.exitCode = 1;
