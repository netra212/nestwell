import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("first-visit tip dismisses, restores focus and remains dismissed", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("note")).toContainText(
    "Try describing your ideal home — or tap the mic.",
  );
  await page.getByRole("button", { name: "Dismiss search tip" }).click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.reload();
  await expect(page.getByRole("note")).toHaveCount(0);
});
test("metadata, crawl routes, branded 404 and 500 pages", async ({
  page,
  request,
}) => {
  await page.goto("/for-sale?city=London&bedsMin=3&priceMax=600000");
  await expect(page).toHaveTitle(/London.*3\+ beds.*£0–£600,000/);
  const properties = await (
    await request.get("/api/properties?pageSize=1")
  ).json();
  const p = properties.results[0];
  await page.goto(`/property/${p.id}`);
  await expect(page).toHaveTitle(new RegExp(`${p.bedrooms}-bed.*${p.city}`));
  await expect(
    page.locator('meta[property="og:image"]').first(),
  ).toHaveAttribute("content", /images/);
  const missing = await request.get("/property/not-a-real-property");
  // App Router may already have streamed its loading boundary.
  expect([200, 404]).toContain(missing.status());
  expect(await missing.text()).toContain('content="noindex"');
  await page.goto("/an-address-that-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This address couldn’t be found." }),
  ).toBeVisible();
  await page.goto("/500");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load this page." }),
  ).toBeVisible();
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /saved");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`/property/${p.id}`);
});
test("public mutation origins and auth validation/rate rejection", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/search/parse", {
        headers: { Origin: "https://evil.example" },
        data: { query: "London" },
      })
    ).status(),
  ).toBe(403);
  const ip = `2001:db8:${randomUUID().slice(0, 4)}::2`;
  for (let i = 0; i < 20; i++) {
    const result = await request.post("/api/auth/callback/credentials", {
      headers: { "x-forwarded-for": ip },
      data: { email: 123, password: [] },
    });
    expect(result.status()).toBe(400);
  }
  const limited = await request.post("/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": ip },
    data: { email: "demo@example.com" },
  });
  expect(limited.status()).toBe(429);
  expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
});

test("server-rendered filters stay in sync through sorting and browser history", async ({
  page,
}) => {
  await page.goto("/for-sale?city=London&priceMax=600000&bedsMin=3");
  await expect(
    page.locator('p[role="status"][aria-live="polite"]'),
  ).toContainText("1 property found");
  await page
    .getByRole("combobox", { name: "Sort properties" })
    .selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(page.locator("article")).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/bedsMin=3$/);
  await expect(
    page.getByRole("combobox", { name: "Sort properties" }),
  ).toHaveValue("newest");
});

test("deferred mobile filters open, apply and restore keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/for-sale");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Apply filters" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
