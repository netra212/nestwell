import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const output = resolve("work/quality");
await mkdir(output, { recursive: true });
const response = await fetch(new URL("/api/properties?pageSize=1", origin));
if (!response.ok)
  throw new Error("Start a seeded production server before auditing");
const property = (await response.json()).results[0];
if (!property) throw new Error("Seed the database first");
const thresholds = {
  performance: 85,
  accessibility: 95,
  "best-practices": 90,
  seo: 90,
};
const scores = {};
let failed = false;
for (const [name, path] of [
  ["home", "/"],
  ["results", "/for-sale"],
  ["detail", `/property/${property.id}`],
]) {
  const file = resolve(output, `${name}.json`);
  const args = [
    "exec",
    "lighthouse",
    new URL(path, origin).href,
    "--only-categories=performance,accessibility,best-practices,seo",
    "--form-factor=mobile",
    "--throttling-method=simulate",
    "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
    "--output=json",
    `--output-path=${file}`,
    "--quiet",
  ];
  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    failed = true;
    continue;
  }
  const report = JSON.parse(await readFile(file, "utf8"));
  scores[name] = Object.fromEntries(
    Object.entries(report.categories).map(([key, value]) => [
      key,
      Math.round(value.score * 100),
    ]),
  );
  console.log(name, scores[name]);
  if (
    report.runtimeError ||
    Object.entries(thresholds).some(([key, min]) => scores[name][key] < min)
  )
    failed = true;
}
await writeFile(
  resolve(output, "summary.json"),
  JSON.stringify({ thresholds, scores }, null, 2),
);
if (failed) process.exitCode = 1;
